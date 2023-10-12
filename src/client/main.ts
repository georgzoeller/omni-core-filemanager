/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */


import Alpine from 'alpinejs'
import {OmniBaseResource, OmniSDKClient} from 'omni-sdk';

const sdk = new OmniSDKClient("omni-core-filemanager").init();

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

// -------------------- Viewer Mode: If q.focusedObject is set, we hide the gallery and show the image full screen -----------------------
const args = new URLSearchParams(location.search)
const params = JSON.parse(args.get('q'))
let focusedObject = null
focusedObject = params?.focusedObject
let viewerMode = focusedObject ? true : false



const downloadObject = async  function(file:OmniBaseResource) {
  await sdk.downloadFile(file, file.fileName)
}



const copyToClipboardComponent = () => {
  return {
    copyText: '',
    copyNotification: false,

    async copyToClipboard(img) {
      const res = await fetch('/fid/' + img.ticket.fid || img.fid);
      const blob = await res.blob();
      const data = [new ClipboardItem({ [blob.type]: blob })];
      await navigator.clipboard.write(data);
      //alert('Object copied to clipboard');
      //navigator.clipboard.writeText(this.copyText);
      this.copyNotification = true;
      let that = this;
      setTimeout(function () {
        that.copyNotification = false;
      }, 3000);
    }
  }
}


class OmniResourceWrapper
{

  static isPlaceholder(obj:any)
  {
    return obj?.onclick != null
  }

  static isAudio(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) && obj?.mimeType?.startsWith('audio/') || obj?.mimeType == 'application/ogg'
  }

  static isImage(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) &&  obj?.mimeType?.startsWith('image/')
  }

  static isVideo(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) &&  obj?.mimeType?.startsWith('video/')
  }

  static isDocument(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) &&  (obj?.mimeType?.startsWith('text/') || obj?.mimeType?.startsWith('application/pdf'))
  }


}

let windowListener
let closeListener

const createGallery = function (imagesPerPage: number, imageApi: string) {

  return {
    viewerMode: viewerMode,
    viewerExtension: null,
    currentPage: 1,
    imagesPerPage: imagesPerPage,
    imageApi: imageApi,
    images: viewerMode ? [] : Array(imagesPerPage + 1).fill({ url: '/ph_250.png', meta: {} }),
    totalPages: () => Math.ceil(this.images.length / this.imagesPerPage),
    multiSelectedObjects: [],
    cursor: null,
    showInfo: true,
    loading: false, // for anims
    scale: 1, // zoom
    x: 0, //pan
    y: 0,
    focusedObject: focusedObject || null,
    hover: false,
    expiryType: 'permanent',
    async handleExpiryChange(event) {
      let selectedValue = event.target.value;
      this.expiryType = selectedValue;
      await this.fetchObjects({limit: this.imagesPerPage, expiryType: selectedValue, replace: true});
      this.multiSelectedObjects = [];
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async makePermanent(file: OmniBaseResource) {
      let result = await sdk.runExtensionScript('action', {action: 'make_permanent', fid: file.fid})
      if (result.ok)
      {
        sdk.showToast('File made permanent: '+ result.file.fileName ,{type: "success", description: "Permanent files are safe from automatic deletion."})
        this.focusedObject = result.file
      }
      else
      {
        sdk.showToast('Failed to make permanent: '+ result.reason,{type: "danger"})
      }
      await this.fetchObjects({limit: this.imagesPerPage,  replace: true});
      this.multiSelectedObjects = [];
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async makeTemporary(file: OmniBaseResource) {
      let result = await sdk.runExtensionScript('action', {action: 'make_temporary', fid: file.fid})
      if (result.ok)
      {
        sdk.showToast(result.file.fileName + ' will now expire at ' + new Date(result.expiry) ,{type: "success", description: "Temporary files are automatically deleted when their expiration date is reached."})
        this.focusedObject = result.file
      }
      else
      {
        sdk.showToast('Failed to make temporary: '+ result.reason,{type: "danger"})
      }
      await this.fetchObjects({limit: this.imagesPerPage,  replace: true});
      this.multiSelectedObjects = [];
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    closeViewerExtension() {
      this.viewerExtension = null

    },

    close() {
      sdk.close();
    },

    async handleWindowEvent(e) {
      console.log('handleWindowEvent', e.data)
      if (e.data?.type === "close_editor_extension") {

        this.closeViewerExtension()
        if (e.data.newFocus)
        {
          this.focusObject(e.data.newFocus)
        }
        await this.fetchObjects({replace:true, limit: imagesPerPage, expiryType: this.expiryType})
      }
    },

    async init() {

      await this.fetchObjects({replace:true, limit: imagesPerPage, expiryType: this.expiryType})

      if (windowListener)
      {
        window.removeEventListener('message', windowListener)
        windowListener = null
      }
      if (closeListener)
      {
        window.removeEventListener('close', closeListener)
        closeListener = null
      }
      windowListener = this.handleWindowEvent.bind(this)

      closeListener = () => {
        window.removeEventListener('message', windowListener)
        windowListener = null
        window.removeEventListener('close', windowListener)
        closeListener = null
        console.log('closed')
      }

      window.addEventListener('message', windowListener)
      window.addEventListener('close', closeListener)

      if (viewerMode)
      {
        this.focusObject(focusedObject)
      }

    },
    async handleUpload(files: FileList){
      const uploaded = await sdk.uploadFiles(files, 'permanent')

      await this.fetchObjects({replace:true, limit: imagesPerPage, expiryType: this.expiryType})
    },
    async runRecipeWith(runFiles: any[])
    {

      // Todo: this should be a generic function
      let files = Alpine.raw([...runFiles].filter(f => f?.mimeType.startsWith('image/') || f?.mimeType.startsWith('audio/') || f.mimeType == 'application/ogg' || f.mimeType == 'application/pdf' || f.mimeType == 'application/x-pdf'))
      let images = files.filter(f => f?.mimeType.startsWith('image/'))
      let audio = files.filter(f => f?.mimeType.startsWith('audio/') || f.mimeType == 'application/ogg')
      let documents = files.filter(f => f.mimeType == 'application/pdf' || f.mimeType == 'application/x-pdf')

      let args = {
        images, audio, documents,
      }

      //@ts-ignore
      window.parent.client.runScript('run', args)


    },

    getDisplayUrl(file, opts) {
      if (!file) {
        return '/404.png'
      }
      else if (file?.mimeType?.startsWith('audio/') || file.mimeType == 'application/ogg') {
        return '/audio.png'
      }
      else if (file?.mimeType?.startsWith('application/json') || file.mimeType == 'text/json') {
        return '/json.png'
      }

      else if (file?.mimeType?.startsWith('application/pdf')) {
        return '/pdf.png'
      }

      else if (file?.mimeType?.startsWith('text/')) {
        return '/document.png'
      }

      else if (file?.mimeType?.startsWith('image/')) {

        if (opts && (opts.width || opts.height)) {
          let url = file.url
          // add all provided opts into query string using UrlSearchParams
          const params = new URLSearchParams()

          if (opts.height) params.set('height', opts.height)
          if (opts.width) params.set('width', opts.width)
          if (opts.fit) params.set('fit', opts.fit)
          url += '?' + params.toString()
          return url
        }

        return file.url
      }
      else  if (file?.meta?.type === 'recipe') {
        return '/recipe.png'
      }
      else {
        console.log(Alpine.raw(file))
        return '/ph_250.png'
      }
    },

    async addToCanvas(objs) {

      if (!objs)
      {
        return
      }

      if (!Array.isArray(objs))
      {
        objs= [objs]
      }

      let images = objs.filter(img=>OmniResourceWrapper.isImage(img))
      images.map(img => {
        sdk.runClientScript('add', ["omnitool.input_static_image", {img: 'fid://' + img.fid, preview: [JSON.parse(JSON.stringify(img))]}] )
      })

      let documents = objs.filter(obj=>OmniResourceWrapper.isDocument(obj))
      documents.map(doc =>
      {
        sdk.runClientScript('add', ["omnitool.input_static_document", {doc: 'fid://' + doc.fid, preview: [JSON.parse(JSON.stringify(doc))]}] )
      })


    },

    canEdit(obj) {
      return obj && sdk.canEditFile(Alpine.raw(obj))
    },

    canView(obj)
    {
      return obj && sdk.canViewFile(Alpine.raw(obj))
    },



    async addItems(images, replace = false)
    {

      let lastCursor = this.cursor
      if (images && images.length) {
        this.images = this.images.filter(item => item.onclick == null)


        this.cursor = images[images.length - 1].seq
        if (replace) {
          this.images = images
        }
        else
        {
          this.images = this.images.concat(images)

        }


        if (this.images.length) {
          let self = this
          if (lastCursor != this.cursor || replace) {
            this.images.push({
              onclick: async () => {
                await self.fetchObjects({ cursor: self.cursor,  expiryType: this.expiryType })
              }, url: '/more.png', meta: {}, fileName: "Load More..."
            })
          }
        }

        this.totalPages = Math.ceil(this.images.length / this.imagesPerPage);

      }
      else
      {
        if (replace)
        {
          this.images = []
          this.totalPages = 0;
        }
      }

    },



    async fetchObjects(opts?: { cursor?: string, limit?: number,  replace?: boolean,  expiryType?: 'any'|'permanent'|'temporary'}) {
      if (this.viewerMode) {
        return Promise.resolve()
      }
      const body: { limit: number, cursor?: string, expiryType?: 'permanent' | 'temporary' } = { limit: this.imagesPerPage }
      if (opts?.cursor) {
        body.cursor = opts?.cursor
      }
      if(opts?.limit && typeof(opts.limit) === 'number' &&  opts.limit > 0) {
        body.limit = Math.max(opts.limit,2)
      }
      if(opts?.expiryType && opts.expiryType !== 'any')
      {
        body.expiryType = opts.expiryType
      }
      else
      {
        body.expiryType = this.expiryType
      }
      const data = await sdk.runExtensionScript('files', body)

      this.addItems(data.images, opts?.replace)


    },
    selectObject(img) {
      if (img.onclick) {
        return
      }
      const idx = this.multiSelectedObjects.indexOf(img);
      if (idx > -1) {
        this.multiSelectedObjects.splice(idx, 1);  // Deselect the image if it's already selected
      } else {
        this.multiSelectedObjects.push(img);  // Select the image
      }
    },
    paginate() {

      /*console.log('paginate')
      const start = (this.currentPage - 1) * this.imagesPerPage;
      const end = this.currentPage * this.imagesPerPage;
      return this.images.slice(start, end);*/
      return this.images
    },

    async nextObject() {
      const currentIndex = this.images.indexOf(this.focusedObject);
      if (currentIndex < this.images.length - 1) {
        await this.focusObject(this.images[currentIndex + 1]);
      }

    },

    animateTransition() {
      if (this.loading) {
        return
      }
      this.loading = true;
      setTimeout(() => {
        this.loading = false;
      }, 200); // Adjust this delay as needed
    },

    async previousObject() {
      const currentIndex = this.images.indexOf(this.focusedObject);
      if (currentIndex > 0) {
        await this.focusObject(this.images[currentIndex - 1]);
      }

    },


    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage += 1;
      }
    },

    mouseEnter() {
      this.hover = true;
    },
    mouseLeave() {
      this.hover = false;
    },

    async runViewerAction(obj:any, action:string) {
      if (OmniResourceWrapper.isImage(obj))
      {
        if(action === 'edit')
        {
          // Signal the intent to edit the object, leaving the host to decide which editor to use
          sdk.signalIntent('edit','', Alpine.raw(obj), {winbox:{title: 'Edit Image'}})

          //@ts-ignore
          //window.parent.client.workbench.showExtension('omni-extension-minipaint', {url: this.focusedObject?.url, filename: this.focusedObject?.fileName}, undefined, {winbox:{title: 'Edit Image'}})

          //this.viewerExtension='/extensions/omni-extension-minipaint/?q='+encodeURIComponent(JSON.stringify({url: this.focusedObject?.url, filename: this.focusedObject?.fileName}));

          this.showInfo = false
          return
        }
      }
      else if (OmniResourceWrapper.isAudio(obj))
      {
         sdk.signalIntent('edit','', Alpine.raw(obj), {winbox:{title: 'Edit Audio'}})
        //@ts-ignore
        //window.parent.client.workbench.showExtension('omni-extension-wavacity', {url: this.focusedObject?.url, filename: this.focusedObject?.fileName}, undefined, {winbox:{title: 'Edit Audio'}})
      }
    },

    async enterViewerMode(img)
    {

      if (img.mimeType.startsWith('application/pdf'))
      {
        this.viewerExtension = '/extensions/omni-core-viewers/pdf.html?file='+encodeURIComponent(`/fid/${img.fid}`)
      }
      else if( img.mimeType.startsWith('text/markdown'))
      {
        this.viewerExtension = '/extensions/omni-core-viewers/markdown.html?q='+encodeURIComponent(JSON.stringify(
          {
            file: {
              fid: img.fid,
              mimeType: img.mimeType
            }
          }))
      }
      else if( img.mimeType.startsWith('text/plain'))
      {
        this.viewerExtension = '/extensions/omni-core-viewers/monaco.html?q='+encodeURIComponent(JSON.stringify(
          {
            file: {
              fid: img.fid,
              mimeType: img.mimeType
            }
          }))
      }
      else if (OmniResourceWrapper.isAudio(img))
      {
        this.viewerExtension = '/extensions/omni-extension-plyr/?q='+encodeURIComponent(JSON.stringify({sources:[img]}))
      }



    },

    async focusObject(img) {



      if (img == null)
      {
        this.viewerExtension = null
        this.focusedObject = null
        return
      }



      this.enterViewerMode(img)


      this.animateTransition()
      this.x = 0
      this.y = 0
      this.scale = 1
      if (img.onclick != null) {
        await img.onclick.call(img)
        return
      }
      this.focusedObject = img;
      console.log('focusedObject', Alpine.raw(this.focusedObject))
    },

    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
      }
    },

    async sendToChat(img) {
        if (Array.isArray(img)) {

          let obj = {}

          img.forEach(o => {

            let type
            if (OmniResourceWrapper.isAudio(o))
            {
              type='audio'
            }
            else if (OmniResourceWrapper.isImage(o))
            {
              type = 'images'
            }
            else if (OmniResourceWrapper.isDocument(o))
            {
              type = 'documents'
            }
              obj[type] ??=[]
              obj[type].push(o)
          })


          sdk.sendChatMessage(``, 'text/markdown', {
            ...obj, commands: [
              { 'id': 'run', title: '🞂 Run', args: [null, img] }]
          }, ['no-picture'])
          this.multiSelectedObjects = []
        }
        else {

        let type

        if (OmniResourceWrapper.isAudio(img))
        {
          type = 'audio'
        }
        else if (OmniResourceWrapper.isImage(img))
        {
          type = 'images'
        }
        else if (OmniResourceWrapper.isDocument(img))
        {
          type = 'documents'

        }
          let obj = {}
          obj[type] =  [{ ...img }]

          sdk.sendChatMessage(``, 'text/markdown', {
            ...obj, commands: [
              { 'id': 'run', title: '🞂 Run', args: [null, { ...img }] }]
          }, ['no-picture'])
        }


    },
    async exportObject(img) {
      const imageFid = img
      const action = 'export'
      let args = {}
      //@ts-ignore
      const workflow = await window.parent.client.workbench.toJSON()

      if (!workflow) {
        alert('No active workflow')
      }
      const payload = { imageFid, action, args, recipe:workflow }
      const result = (<any>await sdk.runExtensionScript('export', payload))
      if (result.ok) {
        const resultObject = result.image
        await downloadObject(resultObject)
        await this.fetchObjects({replace:true, limit: imagesPerPage, expiryType: this.expiryType})
      }
      else
      {
        alert('Failed to export image: '+  result.reason)

      }


    },

    async importObject(img) {

      let args = {
        action: 'import',
        imageFid: img.fid,
      }
      const file = <any>(await sdk.runExtensionScript('export', args)).file
      console.log('import', file)
      window.parent.location.href = window.parent.location.protocol + "//" + window.parent.location.host + `/?rx=${encodeURIComponent(file.url)}`;


    },
    zoomObject(event) {
      // Determine whether the wheel was scrolled up or down
      const direction = event.deltaY < 0 ? 0.1 : -0.1;

      // Get the current scale of the image
      const currentScale = this.$refs.zoomImg.style.transform || 'scale(1)';
      const currentScaleValue = parseFloat(currentScale.slice(6, -1));

      // Calculate the new scale
      const newScale = Math.min(Math.max(0.75, currentScaleValue + direction), 5.0);
      this.scale = newScale

      // Set the new scale
      this.$refs.zoomImg.style.transform = `scale(${newScale})`;
    },
    async deleteByFid(img) {
      console.log('delete', img)
      if (!Array.isArray(img)) {
        img = [img]
      }

      if (img.length > 1)
      {
        if (!confirm(`Are you sure you want to delete ${img.length} items?`)) {
          return
        }
      }

      let data = await sdk.runExtensionScript('delete', {delete: img})

      if (!data.ok) {
        sdk.sendChatMessage('Failed to delete image(s) ' + data.reason, 'text/plain', {}, ['error'])
        return
      }

      this.multiSelectedObjects = []
      if (data.deleted) {

        this.images = this.images.filter(img => {
          console.log(img)
          if (img.onclick != null) return true

          let deleted = data.deleted.includes(img.fid)
          return !deleted
        })

        if (this.focusedObject) {
          if (data.deleted.includes(this.focusedObject.fid)) {
            this.focusedObject = null
            // In viewer mode, we close the extension if the focused image is deleted
            if (this.viewerMode === true) {
              sdk.close()
            }
          }
        }

        await this.fetchObjects({cursor: this.cursor, limit: data.deleted.length})

      }

    }
  }

}





window.Alpine = Alpine
document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({

    Resource: OmniResourceWrapper,

    copyToClipboardComponent,
    createGallery,
    async copyToClipboard(imgUrl) {
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const data = [new ClipboardItem({ [blob.type]: blob })];
        await navigator.clipboard.write(data);
        alert('Object copied to clipboard');
      } catch (err) {
        console.error(err.name, err.message);
      }
    },
    allowNSFW: false,
    moving: false,
    startMoving(e) {
      this.moving = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      e.preventDefault();
    },
    move(e) {
      if (!this.moving) return;
      this.x += e.clientX - this.lastX;
      this.y += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },
    stopMoving() {
      this.moving = false;
    },


  }

  ))

}
)




Alpine.start()




export default {}
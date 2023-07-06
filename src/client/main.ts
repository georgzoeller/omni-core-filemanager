import Alpine from 'alpinejs'

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

const args = new URLSearchParams(location.search)
const params = JSON.parse(args.get('q'))
let focusedImage = null
focusedImage = params?.focusedImage
let viewerMode = focusedImage ? true : false


const  createGallery = function  (imagesPerPage: number, imageApi: string)
{


    return {
        viewerMode: viewerMode,
        currentPage: 1,
        imagesPerPage: imagesPerPage,
        imageApi: imageApi,
        images: viewerMode ? [] :  Array(imagesPerPage+1).fill({ url: '/ph_250.png', meta: {}}),
        totalPages: () => Math.ceil(this.images.length / this.imagesPerPage),
        multiSelectedImages: [],
        hasImages: false,
        cursor: null,

        async init()
        {

                await this.fetchImages()

        },

        async fetchImages(opts?:{cursor?:string}) {
            if (this.viewerMode)
            {
                return Promise.resolve()
            }

            const body: {limit:number, cursor?: string} = { limit: this.imagesPerPage }
            if (opts?.cursor)
            {
                body.cursor = opts?.cursor
            }
            const response = await fetch('/api/v1/mercenaries/runscript/omni-core-filemanager:files',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );
            const data = await response.json();
            let lastCursor =  this.cursor
            if (data.images)
            {
                this.images = this.images.filter(item=>item.onclick==null)
                if (this.hasImages !+= null)
                {
                    this.images = this.images.concat(data.images)
                }
                else
                {
                    this.images = data.images;
                }

                this.cursor = this.images[this.images.length-1].seq

            }
            if (data.images.length)
            {
                this.hasImages = true
                let self = this
                if (lastCursor != this.cursor)
                {
                    this.images.push({ onclick: async ()=>{
                        await self.fetchImages({cursor:self.cursor})},    url: '/more.png', meta: {}})
                    }
            }

            this.totalPages = Math.ceil(this.images.length / this.imagesPerPage);
        },
        selectImage(img) {
            const idx = this.multiSelectedImages.indexOf(img);
            if (idx > -1) {
                this.multiSelectedImages.splice(idx, 1);  // Deselect the image if it's already selected
            } else {
                this.multiSelectedImages.push(img);  // Select the image
            }
        },
        paginate() {

            /*console.log('paginate')
            const start = (this.currentPage - 1) * this.imagesPerPage;
            const end = this.currentPage * this.imagesPerPage;
            return this.images.slice(start, end);*/
            return this.images
        },

        nextImage() {
            const currentIndex = this.images.indexOf(this.focusedImage);
            if (currentIndex < this.images.length - 1) {
                this.focusedImage = this.images[currentIndex + 1];
            }
        },
        previousImage() {
            const currentIndex = this.images.indexOf(this.focusedImage);
            if (currentIndex > 0) {
                this.focusedImage = this.images[currentIndex - 1];
            }
        },

        nextPage() {
            if(this.currentPage < this.totalPages) {
                this.currentPage += 1;
            }
        },
        hover: false,
        mouseEnter() {
            this.hover = true;
        },
        mouseLeave() {
            this.hover = false;
        },
        focusedImage: focusedImage || null,
        focusImage(img) {
            this.focusedImage = img;
            console.log('focusImage', img)
        },

        previousPage() {
            if(this.currentPage > 1) {
                this.currentPage -= 1;
            }
        },

        async deleteByFid(img) {
            console.log('delete', img)
            if (!Array.isArray(img))
            {
                img = [img]
            }

            let result = await fetch('/api/v1/mercenaries/runscript/omni-core-filemanager:delete',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({delete:img})
                }
            );
            let data = await result.json();

            if (!data.ok)
            {
                //@ts-expect-error
                window.parent.client.sendSystemMessage('Failed to delete image(s) ' + data.error, 'text/plain', {}, ['error'])
            }

            if (data.deleted)
            {
                this.images = this.images.filter(img=>{
                    console.log(img)
                    if (img.onclick != null) return true

                    let deleted =   data.deleted.includes(img.ticket.fid)
                    return !deleted
                })
                if (this.focusedImage)
                {
                    if (data.deleted.includes(this.focusedImage.ticket.fid))
                    {
                        this.focusedImage = null
                    }
                }
            }

        }
    }

}



window.Alpine = Alpine
document.addEventListener('alpine:init', async () =>
Alpine.data('appState', () => ({
    createGallery


})))


Alpine.start()

;  // expose class to global scope so Alpine.js can access it

export default {}



import Alpine from 'alpinejs'

declare global {
    interface Window {
        Alpine: typeof Alpine;
    }
}

// -------------------- Viewer Mode: If q.focusedImage is set, we hide the gallery and show the image full screen -----------------------
const args = new URLSearchParams(location.search)
const params = JSON.parse(args.get('q'))
let focusedImage = null
focusedImage = params?.focusedImage
let viewerMode = focusedImage ? true : false


const copyToClipboardComponent = () =>
{
    return {
    copyText: '',
    copyNotification: false,

  async copyToClipboard(img) {
    const res = await fetch(img.url);
    const blob = await res.blob();
    const data = [new ClipboardItem({ [blob.type]: blob })];
    await navigator.clipboard.write(data);
    //alert('Image copied to clipboard');
    //navigator.clipboard.writeText(this.copyText);
    this.copyNotification = true;
    let that = this;
    setTimeout(function(){
        that.copyNotification = false;
    }, 3000);
  }
}
}



const createGallery = function (imagesPerPage: number, imageApi: string) {

    return {
        viewerMode: viewerMode,
        currentPage: 1,
        imagesPerPage: imagesPerPage,
        imageApi: imageApi,
        images: viewerMode ? [] : Array(imagesPerPage + 1).fill({ url: '/ph_250.png', meta: {} }),
        totalPages: () => Math.ceil(this.images.length / this.imagesPerPage),
        multiSelectedImages: [],
        hasImages: false,
        cursor: null,
        showInfo: false,
        loading: false, // for anims
        scale: 1, // zoom
        x: 0, //pan
        y: 0,
        focusedImage: focusedImage || null,
        hover: false,

        async init() {

            await this.fetchImages()

            let self = this

        },

        getDisplayUrl(file) {
            if (!file) {
                return '/404.png'
            }
            else if (file?.mimeType?.startsWith('audio/') || file.mimeType == 'application/ogg') {
                return '/audio.png'
            }
            else {
                return file.url
            }
        },

        async fetchImages(opts?: { cursor?: string }) {
            if (this.viewerMode) {
                return Promise.resolve()
            }

            const body: { limit: number, cursor?: string } = { limit: this.imagesPerPage }
            if (opts?.cursor) {
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
            let lastCursor = this.cursor
            if (data.images) {
                this.images = this.images.filter(item => item.onclick == null)

                data.images = data.images.map(f => {
                    if (f.mimeType.startsWith('audio/') || f.mimeType == 'application/ogg') {
                        f.isAudio = true
                    }
                    return f
                })


                if (this.hasImages! += null) {
                    this.images = this.images.concat(data.images)
                }
                else {
                    this.images = data.images;
                }

                this.cursor = this.images[this.images.length - 1].seq

            }
            if (data.images.length) {
                this.hasImages = true
                let self = this
                if (lastCursor != this.cursor) {
                    this.images.push({
                        onclick: async () => {
                            await self.fetchImages({ cursor: self.cursor })
                        }, url: '/more.png', meta: {}
                    })
                }
            }

            this.totalPages = Math.ceil(this.images.length / this.imagesPerPage);
        },
        selectImage(img) {
            if (img.onclick) {
                return
            }
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

        async nextImage() {
            const currentIndex = this.images.indexOf(this.focusedImage);
            if (currentIndex < this.images.length - 1) {
                await this.focusImage(this.images[currentIndex + 1]);
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

        async previousImage() {
            const currentIndex = this.images.indexOf(this.focusedImage);
            if (currentIndex > 0) {
                await this.focusImage(this.images[currentIndex - 1]);
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

        async focusImage(img) {
            this.animateTransition()
            this.x = 0
            this.y = 0
            this.scale = 1
            if (img.onclick != null) {
                await img.onclick.call(img)
                return
            }
            this.focusedImage = img;
            console.log('focusImage', img)
        },

        previousPage() {
            if (this.currentPage > 1) {
                this.currentPage -= 1;
            }
        },

        async sendToChat(img) {

            if (Array.isArray(img)) {
                //@ts-expect-error
                window.parent.client.sendSystemMessage(``, 'text/markdown', {
                    images: img, commands: [
                        { 'id': 'run', title: '🞂 Run', args: [null, img ]}]
                }, ['no-picture'])
                this.multiSelectedImages = []
            }
            else
            {
                //@ts-expect-error
                window.parent.client.sendSystemMessage(``, 'text/markdown', {
                    images: [{ ...img }], commands: [
                        { 'id': 'run', title: '🞂 Run', args: [null, { ...img }] }]
                }, ['no-picture'])
            }

        },
        zoomImage(event) {
            // Determine whether the wheel was scrolled up or down
            const direction = event.deltaY < 0 ? 0.1 : -0.1;

            // Get the current scale of the image
            const currentScale = this.$refs.zoomImg.style.transform || 'scale(1)';
            const currentScaleValue = parseFloat(currentScale.slice(6, -1));

            // Calculate the new scale
            const newScale = Math.min(Math.max(0.75, currentScaleValue + direction),5.0);
            this.scale = newScale

            // Set the new scale
            this.$refs.zoomImg.style.transform = `scale(${newScale})`;
        },
        async deleteByFid(img) {
            console.log('delete', img)
            if (!Array.isArray(img)) {
                img = [img]
            }

            let result = await fetch('/api/v1/mercenaries/runscript/omni-core-filemanager:delete',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ delete: img })
                }
            );
            let data = await result.json();

            if (!data.ok) {
                //@ts-expect-error
                window.parent.client.sendSystemMessage('Failed to delete image(s) ' + data.reason, 'text/plain', {}, ['error'])
                return
            }

            this.multiSelectedImages = []
            if (data.deleted) {

                this.images = this.images.filter(img => {
                    console.log(img)
                    if (img.onclick != null) return true

                    let deleted = data.deleted.includes(img.ticket.fid)
                    return !deleted
                })
                if (this.focusedImage) {
                    if (data.deleted.includes(this.focusedImage.ticket.fid)) {
                        this.focusedImage = null
                    }
                }
            }

        }
    }

}





window.Alpine = Alpine
document.addEventListener('alpine:init', async () =>
{
    Alpine.data('appState', () => ({
        copyToClipboardComponent,
        createGallery,
        async copyToClipboard(imgUrl) {
            try {
                const res = await fetch(imgUrl);
                const blob = await res.blob();
                const data = [new ClipboardItem({ [blob.type]: blob })];
                await navigator.clipboard.write(data);
                alert('Image copied to clipboard');
            } catch (err) {
                console.error(err.name, err.message);
            }
        },
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
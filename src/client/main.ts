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
        images: viewerMode ? [] :  Array(imagesPerPage).fill({ url: 'https://via.placeholder.com/150', meta: {}}),
        totalPages: () => Math.ceil(this.images.length / this.imagesPerPage),
        multiSelectedImages: [],  

 
        async init()
        {   
           
                await this.fetchImages()
           
        },

        async fetchImages() {
            if (this.viewerMode)
            {
                return Promise.resolve()
            }
      
            const response = await fetch('/api/v1/mercenaries/runscript/omni-core-filemanager:files');
            const data = await response.json();
        
 
            this.images = data.images;
        
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
    
            console.log('paginate')
            const start = (this.currentPage - 1) * this.imagesPerPage;
            const end = this.currentPage * this.imagesPerPage;
            return this.images.slice(start, end);
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
        }
    }

}



window.Alpine = Alpine
document.addEventListener('alpine:init', async () => 
Alpine.data('appState', () => ({
    createGallery,
    
})))


Alpine.start()

;  // expose class to global scope so Alpine.js can access it

export default {}
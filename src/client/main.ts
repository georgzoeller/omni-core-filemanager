

class ImageBrowserExtension {
    private images: Array<any> = [];
    private currentPage: number = 1;
    private totalPage: number = 0;
    private focusedImage: any = null;

    constructor(private endpoint: string, private perPage: number) {}


    private async loadImages() {
        try {
            this.images = Array.from({length: this.perPage}, (_, i) => i + 1).map(i=>{return {id:i, url: 'https://via.placeholder.com/150', title: 'Error loading image'}});

            return
            const response = await fetch(`${this.endpoint}?page=${this.currentPage}&limit=${this.perPage}`);
            const data = await response.json();
            this.images = data.images;
            this.totalPage = data.totalPage;
        } catch(error) {
            console.error(error);
            this.images = [].concat([{id:1, url: 'https://via.placeholder.com/150', title: 'Error loading image'},{id:2, url: 'https://via.placeholder.com/150', title: 'Error loading image'}]);

        }
    }
    public async next() {
        if(this.currentPage < this.totalPage) {
            this.currentPage++;
            await this.loadImages();
        }
    }

    public async ready() {
        await this.loadImages();
    }


    public focusImage(image) {
        this.focusedImage = image;
    }
}
import Alpine from 'alpinejs'
//@ts-expect-error
window.Alpine = Alpine

export default ImageBrowserExtension;
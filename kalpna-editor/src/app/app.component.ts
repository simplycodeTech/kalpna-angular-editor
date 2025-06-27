import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'kalpna-editor';

   constructor(private http: HttpClient) {}

  uploadImgPdfHook = {
    image: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file); // 👈 NOTE: key is 'image' for imgbb
      const apiKey = '83e6004582e3535d1428ee583a904683';

      const res = await this.http.post<any>(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        formData
      ).toPromise();

      return res?.data?.url || '';
    },

    pdf: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file); // 👈 NOTE: key is 'image' for imgbb
      const apiKey = '83e6004582e3535d1428ee583a904683';

      const res = await this.http.post<any>(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        formData
      ).toPromise();

      return res?.data?.url || '';
    }
  };
  
}

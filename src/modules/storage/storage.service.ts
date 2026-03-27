import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;
  private readonly bucketName = 'image_bill';

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url') || '';
    const supabaseKey = this.configService.get<string>('supabase.key') || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Download ảnh từ URL bên thứ 3 (Zalo/Telegram) và upload lên Supabase Storage
   */
  async uploadFromUrl(imageUrl: string, folder = 'image_bill'): Promise<string> {
    try {
      this.logger.log(`📥 Đang tải ảnh từ: ${imageUrl}`);
      
      // 1. Download ảnh về dưới dạng Buffer
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      // 2. Tạo tên file duy nhất
      const fileName = `${folder}/${uuidv4()}.jpg`;

      // 3. Upload lên Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      // 4. Lấy Public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      this.logger.log(`✅ Upload thành công: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;

    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi upload ảnh lên Supabase: ${error.message}`);
      // Nếu lỗi, trả về link gốc để hệ thống vẫn cố gắng chạy được (fallback)
      return imageUrl;
    }
  }
  /**
   * Upload ảnh trực tiếp từ Buffer lên Supabase Storage
   */
  async uploadBuffer(buffer: Buffer, contentType: string, folder = 'image_bill'): Promise<string> {
    try {
      const fileName = `${folder}/${uuidv4()}.jpg`;
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      this.logger.error(`❌ Lỗi khi upload Buffer lên Supabase: ${error.message}`);
      throw error;
    }
  }
}

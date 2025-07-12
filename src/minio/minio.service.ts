import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Client as MinioClient } from 'minio'
import * as fs from 'fs'

@Injectable()
export class MinioService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MinioService.name)
  private minioClient: MinioClient

  constructor() {
    this.minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || 'minio9000.work.gd',
      port: parseInt(process.env.MINIO_PORT || '443'),
      useSSL: true,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    })
  }

  onModuleInit(): void {
    this.logger.log('MinIO client initialized')
    // Không cần tạo bucket ở đây nếu dùng động
  }

  onModuleDestroy(): void {
    this.logger.log('MinIO service shutdown')
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(bucket)
      if (!exists) {
        await this.minioClient.makeBucket(bucket, 'us-east-1')
        this.logger.log(`Created bucket: ${bucket}`)
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket exists: ${bucket}`, error.stack)
      throw new InternalServerErrorException('Bucket creation failed')
    }
  }

  async uploadFile(
    bucket: string,
    filePath: string,
    objectName: string,
    contentType = 'application/octet-stream',
  ): Promise<string> {
    try {
      const fileStream = fs.createReadStream(filePath)
      const stat = fs.statSync(filePath)

      await this.ensureBucketExists(bucket)

      await this.minioClient.putObject(bucket, objectName, fileStream, stat.size, {
        'Content-Type': contentType,
      })

      this.logger.log(`Uploaded file: ${objectName} to bucket: ${bucket}`)
      return `${bucket}/${objectName}`
    } catch (error) {
      this.logger.error(`Upload failed to bucket ${bucket}`, error.stack)
      throw new InternalServerErrorException('Upload failed')
    }
  }

  async listAllBuckets(): Promise<string[]> {
    try {
      const buckets = await this.minioClient.listBuckets()
      this.logger.log(`Found ${buckets.length} buckets`)
      return buckets.map((b) => b.name)
    } catch (error) {
      this.logger.error('Failed to list buckets', error)
      throw error
    }
  }

  async getFile(bucket: string, objectName: string): Promise<NodeJS.ReadableStream> {
    try {
      const stream = await this.minioClient.getObject(bucket, objectName)
      this.logger.log(`Fetched file: ${objectName} from bucket: ${bucket}`)
      return stream
    } catch (error) {
      const msg = error.message?.toLowerCase() || ''

      if (msg.includes('nosuchbucket')) {
        throw new NotFoundException(`Bucket "${bucket}" không tồn tại`)
      }
      if (msg.includes('nosuchkey')) {
        throw new NotFoundException(`File "${objectName}" không tồn tại trong bucket`)
      }

      throw new InternalServerErrorException('Không thể lấy file từ MinIO')
    }
  }

  async deleteFile(bucket: string, objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(bucket, objectName)
      this.logger.log(`Deleted file: ${objectName} from bucket: ${bucket}`)
    } catch (error) {
      this.logger.error(`Delete failed for ${bucket}/${objectName}`, error.stack)
      throw new InternalServerErrorException('Delete failed')
    }
  }
}

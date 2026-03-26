import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, validateSync, Min } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(0)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL không được để trống' })
  DATABASE_URL: string;

  // @IsString()
  // @IsNotEmpty({ message: 'DIRECT_URL không được để trống' })
  // DIRECT_URL: string;

  @IsString()
  @IsNotEmpty({ message: 'OPENAI_API_KEY không được để trống' })
  OPENAI_API_KEY: string;

  @IsString()
  @IsNotEmpty({ message: 'TELEGRAM_BOT_TOKEN không được để trống' })
  TELEGRAM_BOT_TOKEN: string;

  @IsString()
  @IsNotEmpty({ message: 'ZALO_ACCESS_TOKEN không được để trống' })
  ZALO_ACCESS_TOKEN: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const messages = errors.map(
      error => `👉 ${error.property}: ${Object.values(error.constraints || {}).join(', ')}`
    ).join('\n');
    throw new Error(`\n❌ Cấu hình Environment (.env) bị lỗi hoặc thiếu:\n\n${messages}\n\nVui lòng điền đủ thông tin vào file .env!\n`);
  }
  return validatedConfig;
}

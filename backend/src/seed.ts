import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './users/schemas/user.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    await usersService.create({
      fullName: 'Администратор',
      email: 'admin@sauna.ru',
      password: 'admin123',
      role: UserRole.ADMIN,
    });
    console.log('✅ Admin создан: admin@sauna.ru / admin123');
  } catch (e) {
    console.log('ℹ️ Admin уже существует');
  }

  await app.close();
}

seed();
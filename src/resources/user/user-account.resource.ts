import { Injectable } from '@nestjs/common';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserAccountResource {
  toProfile(user: User): Record<string, unknown> {
    return {
      id: String(user.id),
      name: user.name,
      email: user.email,
      typeProfile: user.type_profile,
      course: user.type_profile === 'student' ? user.course : null,
      institution: user.type_profile === 'student' ? user.institution : null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      avatarUrl: user.profileImage
        ? `/users/me/avatar?version=${encodeURIComponent(user.profileImage.updated_at.toISOString())}`
        : null,
    };
  }
}

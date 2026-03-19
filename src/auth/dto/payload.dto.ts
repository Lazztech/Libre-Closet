export class Payload {
  userId?: any;
  email?: any;
  /** Password fingerprint, is the last 8 chars of the user's bcrypt password hash. With this tokens invalidate on password change. */
  pwf?: string;
}

import { Response } from "express";

/**
 * Standardized API response class.
 *
 * Every endpoint sends responses through this class, ensuring the frontend
 * always receives the same shape regardless of which controller sends it.
 *
 * Success shape:
 * {
 *   "success": true,
 *   "statusCode": 200,
 *   "message": "Login successful",
 *   "data": { ... }
 * }
 *
 * Error shape (handled by error middleware, not this class):
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "message": "Invalid credentials",
 *   "errors": []
 * }
 */
class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T;

  constructor(statusCode: number, data: T, message: string = "Success") {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Sends the response using Express's res object.
   * Usage in a controller:
   *   return new ApiResponse(200, { user }, 'Login successful').send(res)
   */
  send(res: Response): Response {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
    });
  }
}

export default ApiResponse;

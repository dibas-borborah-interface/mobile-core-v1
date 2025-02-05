# API Documentation

## Base URL

The base URL for all API endpoints is: `http://localhost:9000` (development) or your production domain.

## Authentication

Most endpoints require authentication using a JWT token. The token should be sent as an HTTP-only cookie named `auth-token`.

## Rate Limiting

- General API requests: 100 requests per 15 minutes per IP
- Login endpoint: 500 requests per 15 minutes per IP
- Upload endpoint: 100 requests per 15 minutes per IP

## Endpoints

### Health Check

### Register

```
POST /api/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "company": "Test Company"
}

Response:
{
    "access_token": "...",
    "user": {
        "id": "mongodb-id",
        "username": "testuser"
    }
}

```

### Login

```
POST /api/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}

Response:
{
    "access_token": "...",
    "user": {
        "id": "mongodb-id",
        "username": "testuser"
    }
}
```

### Upload Image

```
POST /api/image-upload
Content-Type: multipart/form-data

allowed file types:

    - image/jpeg
    - image/png
    - image/gif
    - application/pdf

{
  "file": "image.jpg"
}

Headers:

    - Authorization: Bearer <token>

Response:
{
    "message": "File uploaded successfully",
    "fileUrl": "https://storage.googleapis.com/interface-core-app/...-image.jpg",
    "filename": "image.jpg",
    "size": 3482884,
    "mimetype": "image/png"
}
```

### Upload Video

```
POST /api/video-upload
Content-Type: multipart/form-data

allowed file types:

    - video/mp4
    - video/quicktime
    - video/x-msvideo
    - video/webm
    - video/avi
    - video/mpeg
    - video/mp2t
    - video/mpeg-2
    - video/mpeg-4
    - video/mpeg-4-generic

{
  "file": "video.mp4"
}

Response:
{
    "message": "File uploaded successfully",
    "fileUrl": "https://storage.googleapis.com/interface-core-app/...-video.mp4",
    "filename": "video.mp4",
    "size": 3482884,
    "mimetype": "video/mp4"
}

```

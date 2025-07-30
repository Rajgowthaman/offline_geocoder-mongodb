
# Reverse Geocoder API (Node.js + MongoDB)

A backend API built with **Express.js** and **MongoDB** that performs reverse geocoding — converting latitude and longitude into a location using proximity search.

## Setup Instructions

Ensure MongoDB is running locally on port 27017.

Start the server:

```bash
node app.js
```

App will run on:

```plaintext
http://localhost:9910
```

---

## API Endpoint

**POST** `/reverseGeoCoding`

### Payload

```json
{
  "lat": 12.9716,
  "long": 77.5946
}
```

### Response

Returns the closest location object from `locations` collection:

```json
{
  "admin1_id": 23,
  "admin1_name": "Karnataka",
  "country_id": "IN",
  "country_name": "India",
  "id": 123456,
  "latitude": 12.9700,
  "longitude": 77.5900,
  "name": "Bangalore"
}
```

### Errors

If location is not found within ±1.5° lat/long:

Responds with HTTP 500 and an error message.

---

## Project Structure

```plaintext
.
├── app.js
├── geocoder
│   └── assets
│       ├── coordinates.js
│       └── locations.js
```

---

## How It Works

- On startup:
  - Connects to `geocoder` database.
  - Checks for `locations` and `coordinates` collections.
  - Populates them if missing using static JS arrays.

- On POST `/reverseGeoCoding`:
  - Performs proximity scoring on `coordinates` collection.
  - Finds the closest feature and retrieves location metadata.

---

## Notes

This app uses a simplified proximity formula (not haversine), sufficient for local reverse lookups.

No external API or internet connection required after setup.

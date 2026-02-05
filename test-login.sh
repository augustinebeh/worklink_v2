#!/bin/bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@worklink.sg","password":"admin123","type":"admin"}' \
  2>/dev/null | jq '.'

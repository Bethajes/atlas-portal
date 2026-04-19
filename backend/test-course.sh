#!/bin/bash

echo "🔑 Getting admin token..."
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"institutionalEmail":"admin@atlas.edu.et","password":"admin123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."

echo ""
echo "📚 Getting departments..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/academic/departments | head -c 500

echo ""
echo ""
echo "📚 Getting semesters..."
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/academic/semesters/active

require('dotenv').config();
const jwt = require('jsonwebtoken');

console.log('JWT_SECRET exists:', process.env.JWT_SECRET ? 'YES' : 'NO');
console.log('REFRESH_SECRET exists:', process.env.REFRESH_SECRET ? 'YES' : 'NO');

if (process.env.JWT_SECRET) {
  const token = jwt.sign({ id: 'test', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '15m' });
  console.log('✅ Token generated:', token.substring(0, 50) + '...');
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token verified:', decoded);
}
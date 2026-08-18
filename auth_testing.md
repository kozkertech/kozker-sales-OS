# SalesMind Auth Testing

## Credentials
- Admin/owner: govind.developer@kozker.com / SalesMind2026! (role: manager)

## MongoDB
```
mongosh
use test_database
db.users.findOne({email:"govind.developer@kozker.com"}, {password_hash:1, role:1, workspace_id:1})
```
Verify bcrypt hash starts with `$2b$`. Index on users.email unique.

## API
```
API=https://salesmind-crm.preview.emergentagent.com
curl -c c.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"govind.developer@kozker.com","password":"SalesMind2026!"}'
curl -b c.txt $API/api/auth/me
curl -b c.txt "$API/api/records?object_type=contact"
```
Login sets httpOnly access_token + refresh_token cookies and returns the user object.

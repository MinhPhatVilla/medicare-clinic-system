# Ket noi PostgreSQL Supabase

Kien truc: frontend -> Express API -> PostgreSQL Supabase. Khong can supabase-js,
Supabase Auth, anon key hay service-role key. Giu nguyen JWT va API hien tai.

## 1. Bao ve database truoc khi tao bang

Trong Supabase, tat Data API o phan cau hinh Data API vi du an chi truy cap
PostgreSQL qua backend. Khong dua bang benh nhan ra REST/GraphQL cong khai.
Neu sau nay bat lai Data API, phai thiet ke quyen truy cap va RLS truoc.
Chi dung du lieu gia cho do an. Khong commit .env, khong gui mat khau vao chat.

## 2. Lay thong so ket noi

Nhan Connect -> Session pooler -> View parameters. Dung host, port va user
chinh xac tren man hinh; khong suy ra host tu region hoac URL https cua project.
Session pooler ho tro IPv4 va phu hop backend Express chay lien tuc.
Tai CA certificate tu Database Settings / SSL Configuration neu can chung chi
de xac minh TLS. Khong tat rejectUnauthorized khi gap loi chung chi.

## 3. Sua nhom DB trong clinic-api/.env

Giu nguyen JWT, PORT, CORS va cac bien khac. Thay cac gia tri DB cu, khong them
hai dong trung ten. Duong dan chung chi Windows nen dung dau /.

```dotenv
DB_HOST=<host trong Session pooler>
DB_PORT=5432
DB_USERNAME=postgres.<project-reference>
DB_PASSWORD="<mat khau database>"
DB_NAME=postgres
DB_SSL=true
DB_SSL_CA_FILE=C:/duong-dan/prod-supabase.cer
DB_POOL_MAX=5
DB_SYNCHRONIZE=false
DB_LOGGING=false
```

DB_SSL_CA_FILE co the de trong neu chung chi server da duoc Node tin cay.
Neu mat khau co ky tu dac biet, chu y cu phap dotenv; khong URL-encode mat khau
vi du an dung cac bien rieng, khong dung connection URI.

## 4. Kiem tra va tao bang

Tu thu muc clinic-api, chay tung lenh:

```sh
npm run db:check
npm run migration:run
npm run build
```

Chi chay migration khi db:check thanh cong va da xac nhan dung project Medicare.
Lenh db:check chi SELECT 1, khong sua bang hay du lieu. Migration tao schema;
khong tu dong sao chep du lieu Docker cu va khong seed du lieu.
Sau do dung backend cu (Ctrl+C trong terminal dang chay; neu chay nen thi dung
dung PID cua backend), va chay npm start. Khong khoi dong hai backend tren cung cong.

Mo frontend http://127.0.0.1:5500, dang xuat phien cu va dang ky email thu moi.
Trong Supabase Table Editor, kiem tra users va patients co ban ghi moi. Tai khoan
local cu khong ton tai tren cloud neu chua chuyen du lieu. Giu database Docker
cu de du phong; chua xoa volume. Chua coi health HTTP 200 la bang chung du lieu
da ghi dung cloud: can kiem tra ban ghi trong project.

Neu dashboard bao het grace period / quota, kiem tra Usage va Billing truoc
khi demo. Khong tu dong nang cap goi hay them thanh toan.

## Tai lieu

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/api/securing-your-api

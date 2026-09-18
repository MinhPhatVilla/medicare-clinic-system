# Thanh toan, nha thuoc va xuat vien

Base URL: `/api/v1/invoices` (`/api/v1/billing` cung dung router nay).
Tat ca API yeu cau `Authorization: Bearer <access-token>`.

## Quyet toan

`PATCH /:id/pay`, quyen CASHIER, RECEPTIONIST hoac ADMIN:

```json
{
  "paymentMethod": "POS_CARD",
  "paymentReference": "POS-001",
  "notes": "Da doi soat khoan thu"
}
```

`paymentMethod`: `CASH`, `VIET_QR`, `POS_CARD`. Day la xac nhan cua thu ngan
sau khi nhan tien; API khong tu thuc hien giao dich voi ngan hang/POS.
`paymentReference` va `notes` khong bat buoc.

Chi quyet toan hoa don PENDING sau khi bac si hoan tat va khoa phieu kham.
Phi thuoc/CLS phai khop chi tiet hien tai. Tra ve `data.invoice`,
`data.transaction` (ma giao dich, phuong thuc, thoi diem, so tien thu lan nay),
`data.pharmacySignal` va `data.discharge`.
So tien thu lan nay = `totalAmount - prepaidAmount`. API thu CLS hien co
cong vao `prepaidAmount` trong cung transaction, tranh thu hai lan.

Thanh toan trung bi tu choi, khong ghi de ma giao dich hoac thoi diem thu tien.
Loi o bat ky buoc nao se rollback hoa don, trang thai CLS va hang doi thuoc.
Khong duoc thay doi chi phi/thuoc cua hoa don da thanh toan.

## Nha thuoc

- `GET /pharmacy/queue?page=1&limit=20`: don thuoc da thanh toan, mac dinh
  loc READY_TO_PREPARE, PREPARING, READY_TO_DISPENSE; ho tro `status`,
  `patientCode`, `phone`, `keyword`.
- `GET /pharmacy/events`: SSE, su kien `pharmacy.queue.changed` bao man hinh
  tai lai hang doi. Dung streaming fetch de gui Bearer header. Ket noi lai
  khi stream dong (toi da 60 giay), tai lai hang doi ngay khi ket noi lai.
  Server kiem tra du lieu da commit moi 2 giay, hoat dong voi nhieu process;
  hang doi luu trong database de khong mat don khi mat ket noi/restart.
- `PATCH /pharmacy/prescriptions/:id/status`, body `{"status":"PREPARING"}`.
  Trinh tu: READY_TO_PREPARE -> PREPARING -> READY_TO_DISPENSE -> DISPENSED.
  Chi PHARMACIST/ADMIN duoc truy cap cac API nha thuoc. DISPENSED luu nguoi
  phat thuoc va thoi diem. Gui lai cung trang thai khong ghi de thong tin.

Don thuoc mien phi van vao hang doi sau khi hoa don duoc xac nhan thanh toan.
Frontend co the tich hop SSE hoac polling API hang doi; thay doi nay cung cap
API va tin hieu, khong them man hinh nha thuoc moi.

## Xuat vien va in phieu

`PATCH /:id/discharge`: CASHIER/RECEPTIONIST/PHARMACIST/ADMIN.
Yeu cau hoa don PAID, phieu kham COMPLETED va da khoa, CLS da hoan tat/huy,
don thuoc (neu co) da DISPENSED. Luu `dischargedAt`, `dischargedByUserId`.

`GET /:id/print?format=pdf` hoac `format=thermal`:

- Chi in hoa don PAID; CASHIER/RECEPTIONIST/ADMIN va benh nhan so huu hoa don.
- PDF nhung font Unicode, giu tieng Viet va tu phan trang, khong cat dong.
- Thermal tra van ban UTF-8, 42 ky tu/dong. Driver may in can ho tro UTF-8
  hoac chuyen encoding; API khong gui lenh ESC/POS truc tiep.
- Phieu the hien ma hoa don, ma giao dich, thoi gian, benh nhan, chi phi,
  giam tru, tien da thu truoc va tien thu lan nay. Khong tinh dich vu da huy.

## Database va trien khai

```sh
npm ci --prefix clinic-api --workspaces=false
npm --prefix clinic-api run migration:run
npm --prefix clinic-api run build
```

Dat `DB_SYNCHRONIZE=false` khi dung migration. Migration bo sung enum,
cot thanh toan/nha thuoc/xuat vien, unique index, FK va CHECK constraints.
Hoa don PAID cu duoc cap ma noi bo `OLD-<uuid>` neu chua co ma; khong tao
gia thoi gian/nguoi thu tien. Du lieu cu sai tong tien, trung phieu kham,
thieu metadata thanh toan hoac tham chieu khong hop le se lam migration
that bai va rollback: can doi soat du lieu truoc khi chay lai.

Truoc khi nang cap he thong co du lieu, doi soat cac khoan CLS da thu tren
hoa don chua quyet toan va dien `prepaidAmount` tu chung tu. Trang thai CLS
cu khong luu du thong tin de suy ra chinh xac khoan da thu sau khi co ket qua.
Don thuoc cua hoa don PAID cu khong tu dong day lai vao hang doi, vi co the
da duoc phat thuoc truoc do. Doi soat nhung don con cho phat khi chuyen doi.

Migration khong co down xoa du lieu kiem toan thanh toan. Can dung ban sao
luu da kiem tra neu phai quay lai phien ban schema cu.

## Kiem thu

`npm --prefix clinic-api run test:invoices` dung PostgreSQL tam rieng, cong
ngau nhien, khong ket noi database trong `.env`. Test bao gom request dong
thoi, rollback, CHECK/FK, phan quyen, SSE, phat thuoc/xuat vien, khoan thu
truoc va PDF nhieu trang co tieng Viet. PostgreSQL tam duoc dung va don dep
sau test. Windows can PowerShell; Node.js 22.13+ cho bo doc PDF trong test.

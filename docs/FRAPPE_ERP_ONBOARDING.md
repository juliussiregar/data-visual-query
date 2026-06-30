# Checklist: onboard server Frappe / ERPNext ke SheetVision

SheetVision menyimpan koneksi per **site ERP** (nama database `_*`). Infra distandarkan **sekali per server MariaDB**; tiap site cukup tambah grant + koneksi baru di UI.

---

## Ringkasan skenario

| Situasi | Host di UI SheetVision (prod) | Setup infra |
|---------|-------------------------------|-------------|
| SheetVision & Frappe **server sama** | **`mariadb`** | Join Docker network Frappe (`docker_default`) |
| Frappe **server lain** | IP private / VPN server ERP | Firewall + user `@IP_SHEETVISION` |
| Dev dari **laptop** | `127.0.0.1` | SSH tunnel ke MariaDB (bukan untuk prod) |

Prod same-server: Host **`mariadb`**, Port **`3306`** (nama service di compose Frappe). Tidak perlu publish port ke host.

---

## A. Server Frappe (sekali per server MariaDB)

### A1. Catat network Docker Frappe

```bash
docker ps | grep -i maria
docker inspect <mariadb_container_id> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}'
```

Biasanya: **`docker_default`**. Tidak perlu menambah `ports:` pada service `mariadb` jika SheetVision join network yang sama.

### A2. Catat site & database

```bash
# Container MariaDB ERP
docker ps | grep -i maria

# Nama database site (contoh ERPNext)
docker exec -it <mariadb_container> mariadb -uroot -p -e "SHOW DATABASES LIKE '\\_%';"
```

| Site (contoh) | Database |
|---------------|----------|
| aluesa-main | `_9f6fb3322932e88a` |
| hrms-main | `_06f74ac1a8b95e0f` |

### A3. Buat user read-only

Ganti password & database. Ulangi `GRANT` per site di server yang sama.

```sql
CREATE USER IF NOT EXISTS 'sheetvision_reader'@'%' IDENTIFIED BY '<password_kuat>';
GRANT SELECT ON `_9f6fb3322932e88a`.* TO 'sheetvision_reader'@'%';
-- site lain:
-- GRANT SELECT ON `_06f74ac1a8b95e0f`.* TO 'sheetvision_reader'@'%';
FLUSH PRIVILEGES;
```

**Server ERP terpisah:** ganti `'%'` dengan IP server SheetVision, mis. `'sheetvision_reader'@'10.0.1.50'`.

### A4. Tes MariaDB (opsional, dari container Frappe network)

```bash
docker run --rm --network docker_default mariadb:10.8 \
  mariadb -h mariadb -usheetvision_reader -p \
  -e "USE \`_9f6fb3322932e88a\`; SELECT COUNT(*) FROM tabCustomer;"
```

- [ ] User bisa `SELECT`  
- [ ] Password disimpan di vault / `.env` tim (jangan di git)

---

## B. Server SheetVision (sekali)

### B1. Deploy app

```bash
cd /path/to/data-visual-query
cp .env.example .env   # isi secret + FRAPPE_DOCKER_NETWORK
docker compose up -d --build
```

Di `.env` server:

```bash
COMPOSE_PROJECT_NAME=data-visual-query
FRAPPE_DOCKER_NETWORK=docker_default
```

Service `app` otomatis join network Frappe lewat `docker-compose.yml` (network `frappe_erp` external).

### B2. Tes jaringan dari container app

**Same server (recommended):**

```bash
docker exec -it sheetvision-app nc -zv mariadb 3306
```

**ERP di server lain** (ganti IP):

```bash
docker exec -it sheetvision-app nc -zv 10.x.x.x 3306
```

- [ ] `nc` sukses dari `sheetvision-app` ke `mariadb:3306`  
- [ ] Firewall allow IP SheetVision → MariaDB (jika beda server)

---

## C. UI SheetVision (per site ERP)

Login → **Sources** atau **Project baru** → tipe **MariaDB**.

| Field | Same server | ERP server lain |
|-------|-------------|-----------------|
| Nama koneksi | `ERP Aluesa` | `ERP Client X` |
| Host | **`mariadb`** | `10.x.x.x` (private/VPN) |
| Port | **`3306`** | `3306` |
| Database | `_9f6fb3322932e88a` | `_xxxxxxxx` |
| Username | `sheetvision_reader` | sama |
| Password | dari A3 | sama |

Klik **Tes & simpan** → pilih tabel (mulai 3–5 tabel inti, jangan 200 sekaligus):

- `tabCustomer`
- `tabSales Invoice`
- `tabSales Order`
- `tabItem`

- [ ] Tes koneksi hijau  
- [ ] Project bisa load data  
- [ ] Koneksi tersimpan untuk dipakai project lain

---

## D. Dev laptop (opsional, bukan prod)

```bash
# Dari laptop — tunnel ke MariaDB di server ERP
ssh -N -L 3307:<IP_CONTAINER_MARIADB>:3306 user@103.150.100.158
```

Form dev: Host `127.0.0.1`, Port `3307`. Tunnel **tidak** dipakai di prod.

---

## E. Troubleshooting cepat

| Gejala | Penyebab umum |
|--------|----------------|
| `ECONNREFUSED` + `mariadb` | SheetVision app belum join network Frappe — cek `FRAPPE_DOCKER_NETWORK` + `docker compose up -d app` |
| `ECONNREFUSED` + `host.docker.internal:3307` | Publish `127.0.0.1:3307` tidak reach dari container — pakai **`mariadb:3306`** + Docker network |
| `Access denied` | User/password salah atau host user tidak match IP SheetVision |
| `Unknown database` | Nama database site salah |
| Banyak tabel, lambat | Pilih sedikit tabel; jangan load semua modul ERP |

---

## F. Checklist final (centang)

**Per server MariaDB**

- [ ] Network Frappe dicatat (`docker_default` atau lain)  
- [ ] User `sheetvision_reader` + `GRANT SELECT` per database site  

**Per server SheetVision**

- [ ] `FRAPPE_DOCKER_NETWORK` di `.env`  
- [ ] `sheetvision-app` running + `nc mariadb 3306` OK  

**Per site ERP (UI)**

- [ ] Koneksi MariaDB tersimpan & tetes  
- [ ] Project dengan tabel inti berjalan  

---

## G. Deploy yang sudah berjalan

Jangan ubah **nama project Docker** sembarangan — data app (users, projects, koneksi) ada di volume `NAMA_PROJECT_db_data`.

### G1. Cek di server ERP / SheetVision

```bash
docker compose ls
docker volume ls | grep -E 'db_data|sheetvision|data-visual'
docker ps --format '{{.Names}}' | grep sheetvision
```

Contoh output volume:

```text
data-visual-query_db_data    # deploy dari folder data-visual-query
sheetvision_db_data          # deploy dengan -p sheetvision atau COMPOSE_PROJECT_NAME
```

### G2. Samakan `.env` sebelum pull / rebuild

Di `.env` server (bukan git), set **sama dengan deploy pertama**:

```bash
COMPOSE_PROJECT_NAME=data-visual-query   # contoh — sesuaikan hasil G1
```

Lalu:

```bash
docker compose up -d --build
```

### G3. Jangan lakukan ini tanpa migrasi

| Aksi | Risiko |
|------|--------|
| Tambah `name: sheetvision` di compose padahal volume lama `data-visual-query_*` | App tampak kosong (DB baru) |
| `docker compose down -v` | **Hapus semua data** SheetVision |
| Ganti `COMPOSE_PROJECT_NAME` tanpa sadar | Volume baru kosong |

Volume lama **tidak terhapus** — masih ada di `docker volume ls`, hanya tidak ter-mount.

### G4. Pulihkan jika sudah kejadian (app kosong setelah deploy)

```bash
docker compose down
# Salin data volume lama → baru (sesuaikan nama volume)
docker volume create sheetvision_db_data
docker run --rm \
  -v data-visual-query_db_data:/from \
  -v sheetvision_db_data:/to \
  alpine sh -c "cp -a /from/. /to/"
# Set COMPOSE_PROJECT_NAME=sheetvision di .env
docker compose up -d
```

---

*Dokumen terkait: [README — MariaDB ERP](../README.md#mariadb-erp-frappe--server-produksi-sama), [docker-compose.yml](../docker-compose.yml).*

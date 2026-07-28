# Geberew Market

**Goal:** Make wholesale prices visible to farmers so they can decide when and where to sell instead of accepting whatever a middleman quotes.

Wholesale price board that connects farmer cooperatives in Oromia and Amhara to Merkato buyers, with an SMS fallback for users without smartphones.

## Team

| Name | Role |
|---|---|
| Mahlet Amare | Project Manager |
| Surafel Muhabaw | Full-Stack Developer |
| Wintana | Junior Developer |
| Surafel Teshale | Junior Developer |
| Habtamu Arega | Junior Developer |
| Tebie Tegenew | Junior Developer |

## Repo structure

```
geberew-market/
├── frontend/       # Daily price board view + Cooperative submission form
├── backend/        # SMS gateway listener + Aggregate to public price index + Security checks
├── sms-gateway/     # SMS-specific parsing/handling logic
└── docs/           # Commodity list seed data, specs, notes
```

## Task -> folder mapping

| Task | Owner area | Location |
|---|---|---|
| Seed commodity list | Data/Intern | `docs/commodities.json` |
| Cooperative submission form | Frontend | `frontend/src` |
| SMS gateway listener | Backend | `sms-gateway/src` |
| Aggregate to a public price index | Backend | `backend/src` |
| Security check on submission form | Backend | `backend/src` |
| Daily price board view | Frontend | `frontend/src` |

## Getting started

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Status

Project is in early setup. See project board for task status and assignees.

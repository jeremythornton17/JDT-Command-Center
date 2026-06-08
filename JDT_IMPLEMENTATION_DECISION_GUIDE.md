# JDT Implementation Decision Guide

Use this as the answer format for the post-audit implementation questions. Short, specific answers are better than broad ideas. The goal is to lock down operating rules so the app can enforce them consistently.

## 1. Project vs Work Order vs Assignment

Answer like this:

| Term | Final Definition | Example |
| --- | --- | --- |
| Project | The client-facing scope that stays active until the overall project is complete. | Boca West Course 1 Renovation |
| Work Order | A planned piece of work inside a project, usually by division or purpose. | Root prune Course 1 trees |
| Assignment | The specific crew, driver, equipment, date, route, or task execution tied to a work order. | Carlos crew root prunes tags 1001-1020 on June 10 |

Recommended default:
- Project is the permanent client/project container.
- Work Order is what needs to happen.
- Assignment is who/what/when/how it gets done.

## 2. Required Fields By Workflow

Answer each workflow with three groups: Required to Save, Required to Dispatch, Required to Close.

Example:

### Project
- Required to Save: client, project name, division, main location, status.
- Required to Dispatch: project ID, job/work-order type, site access if field crews or freight are involved.
- Required to Close: final status, close date, documents/photos if required, billing status if relevant.

Use this same format for:
- Crew work order
- Freight move
- Equipment request
- Maintenance issue
- Project tree
- Nursery inventory item
- Field closeout

Recommended default:
- Keep "Required to Save" minimal.
- Make "Required to Dispatch" strict.
- Make "Required to Close" strict enough for reporting.

## 3. User Roles

Answer like this:

| Role | People | Can See | Can Edit | Cannot Do |
| --- | --- | --- | --- | --- |
| Owner/Admin | Jeremy, Buck | All records | All records | None, except destructive actions should confirm |
| Operations Coordinator | Jennifer, Max | All operating records | Most operating records | Reset app, manage users unless approved |
| Office Admin | Regina | All operating records | Data entry, imports, updates | Reset app, manage users |
| Crew Leader | Carlos, Neftali, etc. | Assigned work and relevant project/job details | Field updates, photos, status | Delete records, edit financial/admin settings |
| Driver | Drivers and driver-capable staff | Assigned freight/work details | Freight status, photos, issues | Delete records, edit unrelated jobs |
| Maintenance | Mechanic/maintenance users | Equipment, trailers, issues, work orders | Maintenance status, notes, parts | Edit unrelated client/admin data |
| Nursery/Sales | Nursery/sales users | Nursery, inventory, pickups, relevant jobs | Inventory and loading updates | Edit unrelated admin data |
| Read Only | Optional clients/project viewers | Their approved project records | None | Internal records |

## 4. Record Visibility

Answer one:

- Option A: Every approved `jdtnurseries.com` user can read all app records.
- Option B: Office/admin users can read all records, field users only see assigned/relevant records.
- Option C: Everybody only sees assigned records unless explicitly shared.

Recommended default:
Option B. It keeps Jeremy/Jennifer/Regina fully informed while keeping crew/driver mobile screens simple.

## 5. Attachments

Answer by document type:

| Attachment Type | Storage Location | Notes |
| --- | --- | --- |
| Field photos | Firebase Storage | Best for app-native upload and tree/job links |
| Driver license / CDL medical card | Firebase Storage with restricted access | Sensitive, restrict to admin/office roles |
| Vehicle registration / insurance | Firebase Storage with restricted access | Add expiration alerts |
| Client docs / proposals / large shared folders | Google Drive | Best when docs already live in Drive |
| Workbook backup | Google Sheets / Drive | App exports should write back to the approved workbook |

Recommended default:
Hybrid. Firebase Storage for app-native uploads and compliance docs, Google Drive for large client/project document folders.

## 6. Real Field Closeout Examples

Answer with 2 to 3 real examples per workflow. Include what the field person actually reports.

Template:

| Scenario | Required Closeout Details | Optional Details |
| --- | --- | --- |
| Relocation crew day | project, work order, crew lead, date, tree tags completed, status, issues, photos | equipment used, weather, tomorrow needs |
| Installation crew day | project, hole/area, material installed, quantity, issues, photos | client contact, change notes |
| Freight driver day | move number, driver, truck, trailer, stops completed, arrival/departure, POD/photo, issue notes | route notes, outside contact |
| Equipment issue day | equipment, location, issue, severity, status, photos | parts needed, estimated downtime |
| Nursery loading day | customer/project, material, quantity, source farm/zone, loaded by, photos if needed | substitutions, short material |

## 7. Project Location / Pin Types

Answer with final labels and whether each is required.

Recommended final set:
- Main address
- Crew access
- Truck/equipment access
- Construction access
- Load/unload pin
- Staging area
- Tree source
- Tree destination
- Farm zone

For each type, decide:
- Can be address, GPS coordinates, or Google Maps URL?
- Is it project-specific, farm-specific, or global?
- Should it appear in crew assignments, freight moves, maps, or all three?

## 8. Offline Queue

Answer one:

- Yes, first pilot needs offline queue for field updates/photos.
- No, first pilot can be online-only.
- Partial, only field closeouts and photos should queue offline.

Recommended default:
Partial. Start with field updates/photos queueing locally, then sync when online. Do not overbuild full offline scheduling yet.

## 9. First Pilot Projects

Answer with exact project names:

| Pilot Type | Project | Why This One |
| --- | --- | --- |
| Relocation with tree pins |  |  |
| Freight-heavy project |  |  |
| Equipment issue workflow |  |  |
| Nursery/material workflow |  |  |

Recommended default:
Pick one active job per workflow, not every job at once.

## 10. Workbook Schema Authority

Answer one:

- App is source of truth after go-live. Workbook is backup and bulk import/export.
- Workbook remains source of truth until the app is fully proven.
- Hybrid, but only for specific records.

Recommended default:
App becomes source of truth after go-live. The JDT Command Center workbook becomes backup and bulk-entry import/export. No competing templates.

## 11. Service / Maintenance Rules

Answer with rule tables:

| Rule Type | Trigger | Alert Timing | Required Fields |
| --- | --- | --- | --- |
| Equipment service interval | hours or days | 30/14/7 days or hour threshold | last service, next due, status |
| Trailer inspection | monthly or custom | before due and overdue | tires, brakes, lights, wiring, deck, kingpin/hitch |
| CDL medical card | expiration date | 60/30/14/7 days | driver, doc, expiration |
| Registration / insurance | expiration date | 60/30/14/7 days | vehicle/trailer, doc, expiration |

## 12. Notifications

Answer by channel and urgency:

| Notification Type | In-App | Email | SMS Later |
| --- | --- | --- | --- |
| Missing crew/equipment/freight | Yes | Optional | No |
| Overdue field update | Yes | Yes for admin | Later |
| CDL/insurance expiration | Yes | Yes | Later |
| Daily command brief | Yes | Yes | No |
| Emergency/blocked work | Yes | Optional | Later |

Recommended default:
Start with in-app alerts and daily email summary. Add SMS later only for urgent field operations.

## 13. Print / TV Board

Answer with layout expectations:

| Output | Audience | Must Show | Should Hide |
| --- | --- | --- | --- |
| Shop TV | crews/drivers | today, tomorrow, crew, equipment, freight, alerts | financials, sensitive docs |
| Office print | Jennifer/Regina/Jeremy | daily schedule, open issues, missing data, follow-ups | sensitive compliance docs |
| Crew handout | crew leaders | assigned work, location, tasks, equipment, notes | unrelated jobs |

## 14. Cost / Profitability Fields

Answer by phase:

- Phase 1: estimated revenue, quoted amount, invoice status, change order flag.
- Phase 2: labor cost, equipment cost, freight cost, material cost.
- Phase 3: division margin, project margin, actual vs estimate.

Recommended default:
Design the fields now, but do not make profitability reporting operational until project/work-order relationships are stable.

## 15. Known Bugs From Jennifer / Regina

Ask them to report bugs in this format:

| Bug | Screen | What I Clicked | What I Expected | What Happened | Data Record | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

Best rule:
If they cannot describe where they were and what record they were editing, the app should make that context more visible.

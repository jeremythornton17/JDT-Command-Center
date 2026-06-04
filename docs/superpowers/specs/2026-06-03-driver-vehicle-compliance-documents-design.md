# Driver and Vehicle Compliance Documents Design

## Goal

Add compliance document tracking to JDT Command Center for drivers, trucks, trailers, and fleet vehicles. The first version will store document metadata and links on existing personnel and equipment records, using the current document URL pattern. This gives the office team a practical way to track required files now, while leaving room for future Google Drive Picker or Firebase Storage upload.

## Scope

Driver profiles will support:

- CDL certified: yes/no.
- Driver license number.
- Driver license expiration date.
- Driver license document URL.
- Medical card expiration date.
- Medical card document URL.

Medical card fields are relevant only when the driver is CDL certified.

Equipment profiles for trucks, trailers, and other registered vehicles will support:

- Registration number or tag.
- Registration expiration date.
- Registration document URL.
- Insurance company or policy.
- Insurance expiration date.
- Insurance document URL.

The feature applies most visibly to Freight vehicles and trailers, but the fields live on `EquipmentRecord` so the same data is available from Equipment and Freight.

## UI Behavior

Employee edit forms will add a `Driver Compliance` section. The section can remain visible for all personnel, but it is intended for role `Driver`. If `CDL Certified` is checked, medical card fields are shown and saved.

Equipment edit forms will add a `Vehicle Compliance` section. Registration and insurance fields are available for any equipment record, because trailers also need compliance tracking.

Crew driver cards will show a compact compliance panel:

- License: on file, missing, expiring, or expired.
- CDL: yes/no.
- Medical card: on file, missing, expiring, or expired when CDL is yes.

Freight vehicle and trailer cards, and Equipment cards, will show:

- Registration status.
- Insurance status.

Status language should be direct and operational: `Missing`, `On File`, `Expiring Soon`, `Expired`.

## Data Model

Extend `CrewRecord` with optional fields:

- `cdlCertified?: boolean`
- `driverLicenseNumber?: string`
- `driverLicenseExpirationDate?: string`
- `driverLicenseDocumentUrl?: string`
- `medicalCardExpirationDate?: string`
- `medicalCardDocumentUrl?: string`

Extend `EquipmentRecord` with optional fields:

- `registrationNumber?: string`
- `registrationExpirationDate?: string`
- `registrationDocumentUrl?: string`
- `insuranceCompany?: string`
- `insurancePolicyNumber?: string`
- `insuranceExpirationDate?: string`
- `insuranceDocumentUrl?: string`

No new Firestore collection is required for the first version. These optional fields will sync through the existing `staff`, `crews`, and `equipment` collections.

## Reporting and Alerts

The first version will compute document status for display on cards. Reports can use the same helper later to create an overall compliance dashboard. The first implementation should include a helper that is easy to reuse in Reports and Command Board risk scoring later.

Expiration logic:

- Missing file/link or missing required date: `Missing`.
- Expiration before today: `Expired`.
- Expiration within 30 days: `Expiring Soon`.
- Otherwise: `On File`.

For medical cards, missing/expiration status only matters when CDL certified is true.

## Tests

Add tests before implementation for:

- Employee form renders driver compliance fields.
- CDL checked shows medical card fields.
- Equipment form renders registration and insurance fields.
- Crew driver cards show license and medical card compliance status.
- Freight or equipment cards show registration and insurance status.
- Compliance helper classifies missing, expiring, expired, and on-file documents correctly.

## Non-Goals For This Version

- No direct binary file upload yet.
- No automatic Google Drive Picker workflow yet.
- No OCR or automatic reading of license/insurance dates.
- No separate compliance collection until the document system matures.

This keeps the build useful immediately while avoiding a file-storage detour before the broader Documents workflow is ready.

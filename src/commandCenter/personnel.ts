import type { CrewRecord } from './records';

export const personnelRoleOptions = [
  'Owner',
  'Office Admin',
  'Operations Coordinator',
  'Crew Leader',
  'Driver',
  'Nutrient Tech',
  'Irrigation Tech',
  'Mechanic',
  'Field Support',
];

export const personnelCrewAllocationOptions = [
  'Ownership',
  'Office',
  'Operations Leadership',
  'Transportation',
  'Nutrient Care',
  'Irrigation',
  'Equipment Maintenance',
  'Field Support',
];

export const personnelLanguageOptions = [
  'English',
  'Spanish',
  'Bilingual',
];

function rosterContact(record: CrewRecord): CrewRecord {
  return {
    ...record,
    availability: record.availability || 'Available',
    isRosterContact: true,
  };
}

function personnelMatchKey(record: Pick<CrewRecord, 'id' | 'name'>) {
  return (record.id || record.name || '').trim().toLowerCase();
}

function hasValue(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function hasDisplayIdentity(record: CrewRecord) {
  return hasValue(record.name) || hasValue(record.phone) || hasValue(record.email) || hasValue(record.role);
}

function mergeRosterContact(record: CrewRecord, override: CrewRecord): CrewRecord {
  const merged: CrewRecord = { ...record };

  for (const [key, value] of Object.entries(override)) {
    if (hasValue(value)) {
      merged[key] = value;
    }
  }

  return {
    ...merged,
    isRosterContact: record.isRosterContact,
  };
}

export const defaultJdtPersonnelRoster: CrewRecord[] = [
  rosterContact({
    id: 'personnel-jeremy-thornton',
    name: 'Jeremy Thornton',
    role: 'Owner',
    phone: '561-312-3004',
    email: 'jeremy@jdtnurseries.com',
    type: 'Ownership',
    skill: 'Owner admin',
    appAccess: 'admin',
    drivesForCompany: true,
    cdlCertified: true,
  }),
  rosterContact({
    id: 'personnel-buck-thornton',
    name: 'Buck Thornton',
    role: 'Owner',
    phone: '863-228-2660',
    email: 'buck@jdtnurseries.com',
    type: 'Ownership',
    skill: 'Owner admin',
    appAccess: 'admin',
    drivesForCompany: true,
    cdlCertified: true,
  }),
  rosterContact({
    id: 'personnel-jeff-swindle',
    name: 'Jeff Swindle',
    role: 'Crew Leader',
    phone: '863-673-1348',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
  }),
  rosterContact({
    id: 'personnel-jack-belcher',
    name: 'Jack Belcher',
    role: 'Crew Leader',
    phone: '863-261-2470',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
    drivesForCompany: true,
    cdlCertified: true,
  }),
  rosterContact({
    id: 'personnel-santiago-lopes',
    name: 'Santiago Lopes',
    role: 'Crew Leader',
    phone: '919-583-2952',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
  }),
  rosterContact({
    id: 'personnel-carlos-reyes',
    name: 'Carlos Reyes',
    role: 'Crew Leader',
    phone: '863-228-1031',
    type: 'Operations Leadership',
    skill: 'Root pruning',
    drivesForCompany: true,
    cdlCertified: true,
  }),
  rosterContact({
    id: 'personnel-samuel-rivera',
    name: 'Samuel Rivera',
    role: 'Crew Leader',
    phone: '863-233-6601',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
  }),
  rosterContact({
    id: 'personnel-earl-bryant',
    name: 'Earl Bryant',
    role: 'Crew Leader',
    phone: '863-673-1880',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
    drivesForCompany: true,
    cdlCertified: true,
  }),
  rosterContact({
    id: 'personnel-nick-lara',
    name: 'Nick Lara',
    role: 'Crew Leader',
    phone: '863-233-0892',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
  }),
  rosterContact({
    id: 'personnel-neftali-euceda',
    name: 'Neftali Euceda',
    role: 'Crew Leader',
    phone: '863-228-7991',
    type: 'Operations Leadership',
    skill: 'Crew leadership',
  }),
  rosterContact({
    id: 'personnel-alex-bueno',
    name: 'Alex Bueno',
    role: 'Driver',
    phone: '863-843-2079',
    type: 'Transportation',
    skill: 'Driver',
    drivesForCompany: true,
  }),
  rosterContact({
    id: 'personnel-christian-crespo',
    name: 'Christian Crespo',
    role: 'Driver',
    phone: '863-228-0351',
    type: 'Transportation',
    skill: 'Driver',
    drivesForCompany: true,
  }),
  rosterContact({
    id: 'personnel-vince-carreno',
    name: 'Vince Carreno',
    role: 'Driver',
    phone: '828-379-4036',
    type: 'Transportation',
    skill: 'Driver',
    drivesForCompany: true,
  }),
  rosterContact({
    id: 'personnel-ron-thompson',
    name: 'Ron Thompson',
    role: 'Driver',
    phone: '863-281-3341',
    type: 'Transportation',
    skill: 'Driver',
    drivesForCompany: true,
  }),
  rosterContact({
    id: 'personnel-carlos-burro',
    name: 'Carlos "Burro"',
    role: 'Nutrient Tech',
    phone: '863-599-1731',
    type: 'Plant Health',
    skill: 'Nutrient tech',
  }),
  rosterContact({
    id: 'personnel-regina-kane',
    name: 'Regina Kane',
    role: 'Office Admin',
    phone: '863-228-1201',
    email: 'regina@jdtnurseries.com',
    type: 'Office',
    skill: 'Office admin',
    appAccess: 'authorized',
  }),
  rosterContact({
    id: 'personnel-jennifer-bermudez',
    name: 'Jennifer Bermudez',
    role: 'Operations Coordinator',
    phone: '239-800-1736',
    email: 'jennifer@jdtnurseries.com',
    type: 'Operations',
    skill: 'Operations coordination',
    appAccess: 'authorized',
  }),
];

export function mergePersonnelRecords(defaultRoster: CrewRecord[], firestoreRecords: CrewRecord[]) {
  const defaultsByKey = new Map(defaultRoster.map(record => [personnelMatchKey(record), record]));
  const firestoreByKey = new Map(firestoreRecords.map(record => [personnelMatchKey(record), record]));

  const mergedDefaults = defaultRoster.map(record => {
    const override = firestoreByKey.get(personnelMatchKey(record));
    return override ? mergeRosterContact(record, override) : record;
  });

  const customRecords = firestoreRecords.filter(record => !defaultsByKey.has(personnelMatchKey(record)) && hasDisplayIdentity(record));
  return [...mergedDefaults, ...customRecords];
}

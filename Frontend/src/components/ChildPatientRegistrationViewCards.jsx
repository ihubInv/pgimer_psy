import {
  PatientDetailCardShell,
  PatientDetailField,
  PatientDetailSectionTitle,
  PatientDetailFieldGroup,
} from './PatientDetailReadOnlyCard';
import { formatDate } from '../utils/formatters';
import {
  CHILD_AGE_GROUP_OPTIONS,
  CHILD_EDUCATIONAL_STATUS_OPTIONS,
  CHILD_OCCUPATIONAL_STATUS_OPTIONS,
  CHILD_RELIGION_OPTIONS,
  CHILD_HEAD_RELATIONSHIP_OPTIONS,
  CHILD_HEAD_EDUCATION_OPTIONS,
  CHILD_HEAD_OCCUPATION_OPTIONS,
  CHILD_HEAD_MONTHLY_INCOME_OPTIONS,
  CHILD_LOCALITY_OPTIONS,
  CHILD_DISTANCE_TRAVELLED_OPTIONS,
  CHILD_SOURCE_OF_REFERRAL_OPTIONS,
  CHILD_SEX_OPTIONS,
  INDIA_STATES,
} from '../utils/constants';

function optLabel(options, value) {
  if (value === undefined || value === null || value === '') return '';
  const found = options?.find((o) => String(o.value) === String(value));
  return found?.label ?? String(value);
}

function stateLabel(value) {
  return optLabel(INDIA_STATES, value);
}

/**
 * Read-only registration summary for child patients (matches adult Out-Patient card style).
 */
export default function ChildPatientRegistrationViewCards({ formData, rooms = [] }) {
  const fd = formData || {};

  const assignedRoomLabel = (() => {
    const num = fd.assigned_room;
    if (num === undefined || num === null || num === '') return '';
    const room = rooms.find((r) => String(r.room_number) === String(num));
    return room ? `${room.room_number}${room.room_name ? ` — ${room.room_name}` : ''}` : String(num);
  })();

  return (
    <div className="space-y-6">


<PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Child personal information</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField label="Child Name" value={fd.child_name} />
            <PatientDetailField label="Mobile No." value={fd.mobile_no} />
            <PatientDetailField label="Sex" value={optLabel(CHILD_SEX_OPTIONS, fd.sex)} />
            <PatientDetailField label="Age" value={fd.age} />
            <PatientDetailField label="Age Group" value={optLabel(CHILD_AGE_GROUP_OPTIONS, fd.age_group)} />
            <PatientDetailField
              label="Educational Status"
              value={optLabel(CHILD_EDUCATIONAL_STATUS_OPTIONS, fd.educational_status)}
            />
            <PatientDetailField
              label="Occupational Status"
              value={optLabel(CHILD_OCCUPATIONAL_STATUS_OPTIONS, fd.occupational_status)}
            />
            <PatientDetailField label="Religion" value={optLabel(CHILD_RELIGION_OPTIONS, fd.religion)} />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>


      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Child Patient Registration</PatientDetailSectionTitle>
        </div>
        <div className="space-y-4 px-5 pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Visit & identification
          </p>
          <PatientDetailFieldGroup>
            <PatientDetailField
              label="Seen as Walk-in On"
              value={fd.seen_as_walk_in_on ? formatDate(fd.seen_as_walk_in_on) : ''}
            />
            <PatientDetailField label="CR Number" value={fd.cr_number} />
            <PatientDetailField label="CGC Number" value={fd.cgc_number} />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>

      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Address details</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField label="Address Line" value={fd.address_line} className="md:col-span-2" />
            <PatientDetailField label="City / Town / Village" value={fd.city_town_village} />
            <PatientDetailField label="District" value={fd.district} />
            <PatientDetailField label="State" value={stateLabel(fd.state)} />
            <PatientDetailField label="Country" value={fd.country} />
            <PatientDetailField label="Pincode" value={fd.pincode} />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>

      

      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Head of family</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField label="Name" value={fd.head_name} />
            <PatientDetailField
              label="Relationship with Child"
              value={optLabel(CHILD_HEAD_RELATIONSHIP_OPTIONS, fd.head_relationship)}
            />
            <PatientDetailField label="Age" value={fd.head_age} />
            <PatientDetailField
              label="Education"
              value={optLabel(CHILD_HEAD_EDUCATION_OPTIONS, fd.head_education)}
            />
            <PatientDetailField
              label="Occupation"
              value={optLabel(CHILD_HEAD_OCCUPATION_OPTIONS, fd.head_occupation)}
            />
            <PatientDetailField
              label="Monthly Income"
              value={optLabel(CHILD_HEAD_MONTHLY_INCOME_OPTIONS, fd.head_monthly_income)}
            />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>

      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Locality, distance & referral</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField label="Locality" value={optLabel(CHILD_LOCALITY_OPTIONS, fd.locality)} />
            <PatientDetailField
              label="Distance Travelled"
              value={optLabel(CHILD_DISTANCE_TRAVELLED_OPTIONS, fd.distance_travelled)}
            />
            <PatientDetailField
              label="Source of Referral"
              value={optLabel(CHILD_SOURCE_OF_REFERRAL_OPTIONS, fd.source_of_referral)}
            />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>

      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Present address</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField label="Address Line" value={fd.present_address_line} className="md:col-span-2" />
            <PatientDetailField label="City / Town / Village" value={fd.present_city_town_village} />
            <PatientDetailField label="District" value={fd.present_district} />
            <PatientDetailField label="State" value={stateLabel(fd.present_state)} />
            <PatientDetailField label="Country" value={fd.present_country} />
            <PatientDetailField label="Pincode" value={fd.present_pincode} />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>

      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Permanent address</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField
              label="Address Line"
              value={fd.permanent_address_line}
              className="md:col-span-2"
            />
            <PatientDetailField label="City / Town / Village" value={fd.permanent_city_town_village} />
            <PatientDetailField label="District" value={fd.permanent_district} />
            <PatientDetailField label="State" value={stateLabel(fd.permanent_state)} />
            <PatientDetailField label="Country" value={fd.permanent_country} />
            <PatientDetailField label="Pincode" value={fd.permanent_pincode} />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>

      <PatientDetailCardShell>
        <div className="px-5 pt-5">
          <PatientDetailSectionTitle>Local address & room</PatientDetailSectionTitle>
        </div>
        <div className="px-5 pb-5">
          <PatientDetailFieldGroup>
            <PatientDetailField label="Local Address" value={fd.local_address_line} className="md:col-span-2" />
            <PatientDetailField label="Assigned Room" value={assignedRoomLabel} />
          </PatientDetailFieldGroup>
        </div>
      </PatientDetailCardShell>
    </div>
  );
}

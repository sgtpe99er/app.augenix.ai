'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { IoPencil, IoCloudUpload, IoTrash } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { AdminSection } from '@/components/admin/section';
import {
  INDUSTRIES,
  STYLE_PREFERENCES,
  WEBSITE_FEATURES,
  TONE_OF_VOICE,
  PRIMARY_CTA_OPTIONS,
  PAYMENT_METHODS,
  SOCIAL_PLATFORMS,
  DAYS_OF_WEEK,
  LANGUAGES,
} from '@/features/onboarding/types';
import type { Business, BrandAsset } from '@/types/database';

type CustomerInput = {
  id: string;
  user_id: string;
  input_type: 'file' | 'url';
  title: string | null;
  notes: string;
  storage_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
};

interface AdminOnboardingTabProps {
  userId: string;
  business: Business | null;
  brandAssets: BrandAsset | null;
  customerInputs: CustomerInput[];
  onRefresh: () => void;
}

type EditingStep = number | null;

const INPUT_CLASS = "w-full rounded-lg border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-zinc-800";
const LABEL_CLASS = "mb-1 block text-sm text-neutral-400";

function getLabel(options: { value: string; label: string }[], value: string) {
  return options.find(o => o.value === value)?.label || value || '—';
}

interface FieldProps {
  label: string;
  field: string;
  editingStep: EditingStep;
  draft: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
}

function StepHeader({ step, title, data, editingStep, saving, onCancel, onSave, onEdit }: {
  step: number; title: string; data: Record<string, unknown>;
  editingStep: EditingStep; saving: boolean;
  onCancel: () => void; onSave: () => void; onEdit: (step: number, data: Record<string, unknown>) => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      {editingStep === step ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button size="sm" variant="emerald" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => onEdit(step, data)}>
          <IoPencil className="mr-1 h-3 w-3" /> Edit
        </Button>
      )}
    </div>
  );
}

function TextField({ label, field, value, type = 'text', placeholder, editingStep, draft, updateField }: FieldProps & { value: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {editingStep !== null ? (
        <input type={type} value={draft[field] as string ?? value ?? ''} onChange={(e) => updateField(field, e.target.value)} className={INPUT_CLASS} placeholder={placeholder} />
      ) : (
        <p className="text-sm">{value || '—'}</p>
      )}
    </div>
  );
}

function SelectField({ label, field, value, options, editingStep, draft, updateField }: FieldProps & { value: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {editingStep !== null ? (
        <select value={draft[field] as string ?? value ?? ''} onChange={(e) => updateField(field, e.target.value)} className={INPUT_CLASS}>
          <option value="">Select...</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <p className="text-sm">{getLabel(options, value)}</p>
      )}
    </div>
  );
}

function TextareaField({ label, field, value, rows = 3, editingStep, draft, updateField }: FieldProps & { value: string; rows?: number }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {editingStep !== null ? (
        <textarea value={draft[field] as string ?? value ?? ''} onChange={(e) => updateField(field, e.target.value)} rows={rows} className={INPUT_CLASS} />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{value || '—'}</p>
      )}
    </div>
  );
}

function BooleanField({ label, field, value, editingStep, draft, updateField }: FieldProps & { value: boolean }) {
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {editingStep !== null ? (
        <select value={(draft[field] as boolean ?? value) ? 'yes' : 'no'} onChange={(e) => updateField(field, e.target.value === 'yes')} className={INPUT_CLASS}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      ) : (
        <p className="text-sm">{value ? 'Yes' : 'No'}</p>
      )}
    </div>
  );
}

function TagsField({ label, field, value, editingStep, draft, updateField }: FieldProps & { value: string[] }) {
  const tags = value || [];
  // Store raw string in draft while editing (keyed as __raw_<field>), split into array on blur
  const rawKey = `__raw_${field}`;
  const rawValue = draft[rawKey] as string | undefined;
  const displayValue = rawValue !== undefined ? rawValue : tags.join(', ');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    updateField(rawKey, raw);
    updateField(field, raw.split(',').map(s => s.trim()).filter(Boolean));
  };

  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {editingStep !== null ? (
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder="Comma-separated values"
          className={INPUT_CLASS}
        />
      ) : (
        <p className="text-sm">{tags.length > 0 ? tags.join(', ') : '—'}</p>
      )}
    </div>
  );
}

function CheckboxField({ label, field, value, options, editingStep, draft, updateField }: FieldProps & { value: string[]; options: { value: string; label: string }[] }) {
  const selected = (editingStep !== null ? (draft[field] as string[] ?? value) : value) || [];
  const toggle = (val: string) => {
    const newVal = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val];
    updateField(field, newVal);
  };
  return (
    <div>
      <label className={LABEL_CLASS}>{label}</label>
      {editingStep !== null ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors ${
                selected.includes(o.value) ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                selected.includes(o.value) ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
              }`}>
                {selected.includes(o.value) && <span className="text-[10px] text-black">✓</span>}
              </div>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm">{selected.length > 0 ? selected.map(v => getLabel(options, v)).join(', ') : '—'}</p>
      )}
    </div>
  );
}

const UPLOAD_CATEGORIES = [
  { key: 'logos', label: 'Logos' },
  { key: 'photos', label: 'Photos' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'team_photos', label: 'Team Photos' },
  { key: 'inspiration', label: 'Inspiration' },
  { key: 'other', label: 'Other' },
] as const;

function CategoryUploadZone({ category, label, files, userId, onRefresh, toast }: {
  category: string;
  label: string;
  files: CustomerInput[];
  userId: string;
  onRefresh: () => void;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', category);
      const res = await fetch(`/api/admin/customers/${userId}/inputs`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Upload failed');
      }
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (inputId: string) => {
    setDeletingId(inputId);
    try {
      const res = await fetch(`/api/admin/customers/${userId}/inputs/${inputId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Delete failed');
      }
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message || 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  };

  const isImage = (mime: string | null) => mime?.startsWith('image/');

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-200">{label}</p>
        <span className="text-xs text-neutral-500">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      {files.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {files.map(f => (
            <div key={f.id} className="group relative rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
              {isImage(f.mime_type) && f.storage_url ? (
                <img src={f.storage_url} alt={f.file_name || ''} className="h-20 w-full object-contain" />
              ) : (
                <div className="flex h-20 items-center justify-center">
                  <span className="text-xs text-neutral-500 px-1 text-center truncate">{f.file_name || 'file'}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
                disabled={deletingId === f.id}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-red-400 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100 disabled:opacity-50"
              >
                <IoTrash className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        onChange={(e) => {
          const fileList = e.target.files;
          if (fileList) Array.from(fileList).forEach(f => handleUpload(f));
          e.currentTarget.value = '';
        }}
        className="hidden"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const fileList = e.dataTransfer.files;
          if (fileList) Array.from(fileList).forEach(f => handleUpload(f));
        }}
        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs transition-colors ${
          isDragOver ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-zinc-600 text-neutral-400 hover:border-zinc-500 hover:text-neutral-300'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <IoCloudUpload className="h-4 w-4" />
        {uploading ? 'Uploading…' : 'Drop files or click to upload'}
      </div>
    </div>
  );
}

export function AdminOnboardingTab({ userId, business, brandAssets, customerInputs, onRefresh }: AdminOnboardingTabProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingStep, setEditingStep] = useState<EditingStep>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const updateField = (field: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (step: number, initialData: Record<string, unknown>) => {
    setEditingStep(step);
    setDraft({ ...initialData });
  };

  const handleCancel = () => {
    setEditingStep(null);
    setDraft({});
  };

  const handleSave = async () => {
    if (editingStep === null) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${userId}/onboarding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: editingStep, responses: Object.fromEntries(Object.entries(draft).filter(([k]) => !k.startsWith('__raw_'))) }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save');
      }
      toast({ description: 'Saved successfully' });
      setEditingStep(null);
      setDraft({});
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Get data from business and brandAssets
  const b = business || {} as any;
  const ba = brandAssets || {} as any;

  // Step 1 data
  const step1Data = {
    businessName: b.business_name || '',
    industry: b.industry || '',
    industryOther: '',
    yearEstablished: b.year_established || null,
    tagline: b.tagline || '',
    description: b.description || '',
    addressStreet: b.address_street || '',
    addressCity: b.location_city || b.address_city || '',
    addressState: b.location_state || b.address_state || '',
    addressZip: b.address_zip || '',
    addressCountry: b.location_country || b.address_country || '',
    phonePrimary: b.phone_primary || '',
    phoneSecondary: b.phone_secondary || '',
    emailPublic: b.email_public || '',
    hours: b.hours || {},
  };

  // Step 2 data
  const step2Data = {
    ownsDomain: b.owns_domain || false,
    existingDomain: b.existing_domain || '',
    domainRegistrar: (b as any).domain_registrar || '',
    existingWebsiteActive: !!(ba.existing_website_url),
    desiredDomain: b.desired_domain || '',
    socialFacebook: ba.social_facebook || '',
    socialInstagram: ba.social_instagram || '',
    socialYoutube: ba.social_youtube || '',
    socialX: ba.social_x || '',
    socialTiktok: ba.social_tiktok || '',
    socialLinkedin: ba.social_linkedin || '',
    socialGoogleBusiness: ba.social_google_business || '',
    socialYelp: ba.social_yelp || '',
  };

  // Step 3 data
  const step3Data = {
    targetLocations: b.target_locations || [],
    serviceAreaRadius: b.service_area_radius || '',
    serviceAreaDescription: b.service_area_description || '',
    targetAudience: b.target_audience || '',
    servicesProducts: b.services_products || '',
    serviceKeywords: b.service_keywords || [],
    competitorUrls: b.competitor_urls || [],
  };

  // Step 4 data
  const step4Data = {
    hasExistingLogo: ba.has_existing_logo || false,
    logoUrls: ba.logo_urls || [],
    hasBrandColors: ba.has_brand_colors || false,
    brandColors: ba.brand_colors || [],
    hasBrandFonts: ba.has_brand_fonts || false,
    brandFonts: ba.brand_fonts || [],
    stylePreference: ba.style_preference || '',
    toneOfVoice: ba.tone_of_voice || '',
    colorPreference: ba.color_preference || '',
    fontPreference: ba.font_preference || '',
    inspirationUrls: ba.inspiration_urls || [],
    inspirationNotes: ba.inspiration_notes || '',
  };

  // Step 5 data
  const step5Data = {
    uploadedLogos: ba.uploaded_logos || [],
    uploadedPhotos: ba.uploaded_photos || [],
    uploadedTeamPhotos: ba.uploaded_team_photos || [],
    uploadedPortfolio: ba.uploaded_portfolio || [],
    uploadedInspiration: ba.uploaded_inspiration || [],
    uploadedOther: ba.uploaded_other || [],
    testimonials: ba.testimonials || [],
    certifications: ba.certifications || [],
    awards: ba.awards || [],
    faqs: ba.faqs || [],
  };

  // Step 6 data
  const step6Data = {
    websiteFeatures: b.website_features || [],
    primaryCta: b.primary_cta || '',
    leadFormFields: b.lead_form_fields || [],
    licenses: b.licenses || [],
    insuranceInfo: b.insurance_info || '',
    associations: b.associations || [],
    paymentMethods: b.payment_methods || [],
    uniqueSellingPoints: b.unique_selling_points || [],
    specialOffers: b.special_offers || [],
    languagesServed: b.languages_served || [],
    integrationsNeeded: b.integrations_needed || [],
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Business Basics */}
      <AdminSection>
        <StepHeader step={1} title="Step 1: Business Basics" data={step1Data} editingStep={editingStep} saving={saving} onCancel={handleCancel} onSave={handleSave} onEdit={handleEdit} />
        {editingStep === 1 || editingStep === null ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Business Name" field="businessName" value={step1Data.businessName} editingStep={editingStep} draft={draft} updateField={updateField} />
              <SelectField label="Industry" field="industry" value={step1Data.industry} options={INDUSTRIES} editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Tagline" field="tagline" value={step1Data.tagline} editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="Year Established" field="yearEstablished" value={step1Data.yearEstablished?.toString() || ''} type="number" editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>
            <TextareaField label="Business Description" field="description" value={step1Data.description} editingStep={editingStep} draft={draft} updateField={updateField} />
            
            <h4 className="mt-4 text-sm font-medium text-neutral-300">Address</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Street Address" field="addressStreet" value={step1Data.addressStreet} editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="City" field="addressCity" value={step1Data.addressCity} editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="State/Province" field="addressState" value={step1Data.addressState} editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="ZIP/Postal Code" field="addressZip" value={step1Data.addressZip} editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="Country" field="addressCountry" value={step1Data.addressCountry} editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>

            <h4 className="mt-4 text-sm font-medium text-neutral-300">Contact</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField label="Primary Phone" field="phonePrimary" value={step1Data.phonePrimary} type="tel" editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="Secondary Phone" field="phoneSecondary" value={step1Data.phoneSecondary} type="tel" editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="Public Email" field="emailPublic" value={step1Data.emailPublic} type="email" editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>

            <h4 className="mt-4 text-sm font-medium text-neutral-300">Business Hours</h4>
            <p className="text-xs text-neutral-500 mb-2">Format: 9:00 AM - 5:00 PM (leave blank for closed)</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {DAYS_OF_WEEK.map(day => {
                const hours = step1Data.hours[day.value] || { open: '', close: '' };
                return (
                  <div key={day.value} className="flex items-center gap-2">
                    <span className="w-12 text-xs text-neutral-400">{day.label.slice(0, 3)}</span>
                    {editingStep === 1 ? (
                      <input
                        type="text"
                        placeholder="9:00 - 17:00"
                        value={`${(draft.hours as any)?.[day.value]?.open || hours.open || ''}${hours.open || (draft.hours as any)?.[day.value]?.open ? ' - ' : ''}${(draft.hours as any)?.[day.value]?.close || hours.close || ''}`}
                        onChange={(e) => {
                          const parts = e.target.value.split('-').map(s => s.trim());
                          const newHours = { ...(draft.hours as any || step1Data.hours), [day.value]: { open: parts[0] || '', close: parts[1] || '' } };
                          updateField('hours', newHours);
                        }}
                        className="flex-1 rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-zinc-800"
                      />
                    ) : (
                      <span className="text-xs">{hours.open && hours.close ? `${hours.open} - ${hours.close}` : 'Closed'}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </AdminSection>

      {/* Step 2: Domain & Social */}
      <AdminSection>
        <StepHeader step={2} title="Step 2: Domain & Online Presence" data={step2Data} editingStep={editingStep} saving={saving} onCancel={handleCancel} onSave={handleSave} onEdit={handleEdit} />
        {editingStep === 2 || editingStep === null ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-neutral-300">Domain</h4>
            <BooleanField label="Do you own a domain?" field="ownsDomain" value={step2Data.ownsDomain} editingStep={editingStep} draft={draft} updateField={updateField} />
            {(editingStep === 2 ? draft.ownsDomain : step2Data.ownsDomain) ? (
              <div className="space-y-4">
                <TextField label="Existing Domain" field="existingDomain" value={step2Data.existingDomain} editingStep={editingStep} draft={draft} updateField={updateField} />
                <TextField label="Domain Registrar" field="domainRegistrar" value={step2Data.domainRegistrar} editingStep={editingStep} draft={draft} updateField={updateField} placeholder="e.g., GoDaddy, Namecheap" />
                <BooleanField label="Is there a website at this domain already?" field="existingWebsiteActive" value={step2Data.existingWebsiteActive} editingStep={editingStep} draft={draft} updateField={updateField} />
              </div>
            ) : (
              <TextField label="What domain would you like?" field="desiredDomain" value={step2Data.desiredDomain} editingStep={editingStep} draft={draft} updateField={updateField} />
            )}

            <h4 className="mt-4 text-sm font-medium text-neutral-300">Social Media Links</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map(platform => (
                <TextField
                  key={platform.value}
                  label={platform.label}
                  field={platform.field}
                  value={(step2Data as any)[platform.field] || ''}
                  type="url"
                  editingStep={editingStep}
                  draft={draft}
                  updateField={updateField}
                />
              ))}
            </div>
          </div>
        ) : null}
      </AdminSection>

      {/* Step 3: SEO & Target Market */}
      <AdminSection>
        <StepHeader step={3} title="Step 3: SEO & Target Market" data={step3Data} editingStep={editingStep} saving={saving} onCancel={handleCancel} onSave={handleSave} onEdit={handleEdit} />
        {editingStep === 3 || editingStep === null ? (
          <div className="space-y-4">
            <TagsField label="Target Locations (cities/areas)" field="targetLocations" value={step3Data.targetLocations} editingStep={editingStep} draft={draft} updateField={updateField} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Service Area Radius" field="serviceAreaRadius" value={step3Data.serviceAreaRadius} editingStep={editingStep} draft={draft} updateField={updateField} />
              <TextField label="Service Area Description" field="serviceAreaDescription" value={step3Data.serviceAreaDescription} editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>
            <TextareaField label="Target Audience" field="targetAudience" value={step3Data.targetAudience} editingStep={editingStep} draft={draft} updateField={updateField} />
            <TextareaField label="Services / Products" field="servicesProducts" value={step3Data.servicesProducts} editingStep={editingStep} draft={draft} updateField={updateField} />
            <TagsField label="Service Keywords (for SEO)" field="serviceKeywords" value={step3Data.serviceKeywords} editingStep={editingStep} draft={draft} updateField={updateField} />
            <TagsField label="Competitor URLs" field="competitorUrls" value={step3Data.competitorUrls} editingStep={editingStep} draft={draft} updateField={updateField} />
          </div>
        ) : null}
      </AdminSection>

      {/* Step 4: Brand & Style */}
      <AdminSection>
        <StepHeader step={4} title="Step 4: Brand & Style" data={step4Data} editingStep={editingStep} saving={saving} onCancel={handleCancel} onSave={handleSave} onEdit={handleEdit} />
        {editingStep === 4 || editingStep === null ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <BooleanField label="Has Existing Logo?" field="hasExistingLogo" value={step4Data.hasExistingLogo} editingStep={editingStep} draft={draft} updateField={updateField} />
              <BooleanField label="Has Brand Colors?" field="hasBrandColors" value={step4Data.hasBrandColors} editingStep={editingStep} draft={draft} updateField={updateField} />
              <BooleanField label="Has Brand Fonts?" field="hasBrandFonts" value={step4Data.hasBrandFonts} editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>
            <TagsField label="Brand Colors (hex codes)" field="brandColors" value={step4Data.brandColors} editingStep={editingStep} draft={draft} updateField={updateField} />
            <TagsField label="Brand Fonts" field="brandFonts" value={step4Data.brandFonts} editingStep={editingStep} draft={draft} updateField={updateField} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Style Preference" field="stylePreference" value={step4Data.stylePreference} options={STYLE_PREFERENCES} editingStep={editingStep} draft={draft} updateField={updateField} />
              <SelectField label="Tone of Voice" field="toneOfVoice" value={step4Data.toneOfVoice} options={TONE_OF_VOICE} editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>
            <TagsField label="Inspiration URLs" field="inspirationUrls" value={step4Data.inspirationUrls} editingStep={editingStep} draft={draft} updateField={updateField} />
            <TextareaField label="Inspiration Notes" field="inspirationNotes" value={step4Data.inspirationNotes} editingStep={editingStep} draft={draft} updateField={updateField} />
          </div>
        ) : null}
      </AdminSection>

      {/* Step 5: Content & Media */}
      <AdminSection>
        <div className="mb-4">
          <h3 className="font-semibold">Step 5: Content & Media</h3>
          <p className="mt-1 text-sm text-neutral-400">Upload images or PDFs into categories. Drag & drop or click to browse.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {UPLOAD_CATEGORIES.map(cat => (
            <CategoryUploadZone
              key={cat.key}
              category={cat.key}
              label={cat.label}
              files={(customerInputs || []).filter(i => i.input_type === 'file' && i.title === cat.key)}
              userId={userId}
              onRefresh={onRefresh}
              toast={toast}
            />
          ))}
        </div>
      </AdminSection>

      {/* Step 6: Website Features */}
      <AdminSection>
        <StepHeader step={6} title="Step 6: Website Features & Preferences" data={step6Data} editingStep={editingStep} saving={saving} onCancel={handleCancel} onSave={handleSave} onEdit={handleEdit} />
        {editingStep === 6 || editingStep === null ? (
          <div className="space-y-4">
            <CheckboxField label="Website Features" field="websiteFeatures" value={step6Data.websiteFeatures} options={WEBSITE_FEATURES} editingStep={editingStep} draft={draft} updateField={updateField} />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Primary CTA" field="primaryCta" value={step6Data.primaryCta} options={PRIMARY_CTA_OPTIONS} editingStep={editingStep} draft={draft} updateField={updateField} />
            </div>
            <TagsField label="Lead Form Fields" field="leadFormFields" value={step6Data.leadFormFields} editingStep={editingStep} draft={draft} updateField={updateField} />
            
            <h4 className="mt-4 text-sm font-medium text-neutral-300">Trust Signals</h4>
            <TextField label="Insurance Info" field="insuranceInfo" value={step6Data.insuranceInfo} editingStep={editingStep} draft={draft} updateField={updateField} />
            <TagsField label="Professional Associations" field="associations" value={step6Data.associations} editingStep={editingStep} draft={draft} updateField={updateField} />
            <CheckboxField label="Payment Methods" field="paymentMethods" value={step6Data.paymentMethods} options={PAYMENT_METHODS} editingStep={editingStep} draft={draft} updateField={updateField} />
            
            <h4 className="mt-4 text-sm font-medium text-neutral-300">Unique Selling Points</h4>
            <TagsField label="USPs" field="uniqueSellingPoints" value={step6Data.uniqueSellingPoints} editingStep={editingStep} draft={draft} updateField={updateField} />
            <CheckboxField label="Languages Served" field="languagesServed" value={step6Data.languagesServed} options={LANGUAGES} editingStep={editingStep} draft={draft} updateField={updateField} />
          </div>
        ) : null}
      </AdminSection>
    </div>
  );
}

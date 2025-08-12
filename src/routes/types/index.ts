// Base types
export interface BaseDocument {
    id: string;
    createdAt: Date;
}

// Product types
export type ProductType = 'vaccine' | 'bundle' | 'package';

export interface Product extends BaseDocument {
    type: ProductType;
    name: string;
    commonName: string;
    description: string;
    price: number | null;
    priceAvacunar: number | null;
    priceVita: number | null;
    priceColsanitas: number | null;
    imageUrl: string;
    applicableDoctors: string[];
    minAge: number;
    maxAge: number;
    specialIndications: string | null;
    manufacturer: string | null;
    dosageInfo: string | null;
    targetDiseases: string | null;
    dosesAndBoosters: string | null;
    includedProductIds: string[] | null;
    includedDoseBundles: string[] | null;
    targetMilestone: string | null;
}

// Article types
export type ArticleCategory = 'education' | 'promotion' | 'announcement';

export interface Article extends BaseDocument {
    title: string;
    excerpt: string;
    body: string;
    heroImageUrl: string;
    publishedAt: Date;
    category: ArticleCategory;
    tags: string[];
    author: string;
}

// Location types
export interface Location extends BaseDocument {
    name: string;
    address: string;
}

// User types
export type UserType = 'normal' | 'pediatrician';

export interface User extends BaseDocument {
    email: string;
    displayName: string | null;
    photoUrl: string | null;
    phoneNumber: string | null;
    lastLoginAt: Date | null;
    isAdmin: boolean;
    userType: UserType;
    patientProfileIds: string[];
    preferredLocationId: string | null;
}

// Pediatrician types
export interface Pediatrician extends BaseDocument {
    email: string;
    displayName: string | null;
    photoUrl: string | null;
    phoneNumber: string;
    lastLoginAt: Date | null;
    isAdmin: boolean;
    userType: UserType.pediatrician;
    specialty: string;
    licenseNumber: string;
    clinicLocationIds: string[];
    bio: string | null;
    yearsExperience: number | null;
}

// Appointment types
export type AppointmentType = 'vaccination' | 'consultation' | 'packageApplication' | 'checkup' | 'followUp';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelledByUser' | 'cancelledByClinic' | 'noShow' | 'pending' | 'rescheduled';

export interface Appointment extends BaseDocument {
    patientId: string;
    patientName: string | null;
    doctorId: string;
    doctorName: string | null;
    doctorSpecialty: string | null;
    dateTime: Date;
    durationMinutes: number;
    locationId: string;
    locationName: string;
    locationAddress: string | null;
    type: AppointmentType;
    productIds: string[];
    status: AppointmentStatus;
    notes: string | null;
    createdByUserId: string | null;
    lastUpdatedAt: Date | null;
}

// Medical History types
export type Severity = 'mild' | 'moderate' | 'severe' | 'unknown';
export type AllergyType = 'medication' | 'food' | 'environmental' | 'other';
export type ConditionStatus = 'active' | 'controlled' | 'inRemission' | 'resolved' | 'unknown';
export type MedicationType = 'prescription' | 'overTheCounter' | 'supplement' | 'vitamin';
export type Relationship = 'mother' | 'father' | 'sibling' | 'child' | 'grandparent' | 'aunt' | 'uncle' | 'other' | 'unknown';
export type TobaccoStatus = 'currentSmoker' | 'formerSmoker' | 'neverSmoked' | 'unknown';

export interface Allergy {
    id: string;
    substance: string;
    reactionDescription: string;
    severity: Severity;
    type: AllergyType;
}

export interface MedicalCondition {
    id: string;
    conditionName: string;
    dateOfDiagnosis: Date;
    status: ConditionStatus;
    notes: string | null;
}

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate: Date | null;
    type: MedicationType;
    notes: string | null;
}

export interface SurgicalHistory {
    id: string;
    procedureName: string;
    date: Date;
    surgeon: string | null;
    hospital: string | null;
    notes: string | null;
}

export interface Hospitalization {
    id: string;
    reason: string;
    admissionDate: Date;
    dischargeDate: Date | null;
    hospital: string | null;
    notes: string | null;
}

export interface ImmunizationHistory {
    id: string;
    vaccineName: string;
    dateAdministered: Date;
    lotNumber: string | null;
    administeredBy: string | null;
    location: string | null;
    notes: string | null;
}

export interface FamilyHistory {
    id: string;
    condition: string;
    relationship: Relationship;
    notes: string | null;
}

export interface ObGynHistory {
    pregnancies: number | null;
    miscarriages: number | null;
    complications: string | null;
}

export interface MedicalHistory {
    patientProfileId: string;
    allergies: Allergy[];
    chronicConditions: MedicalCondition[];
    pastMedicalHistory: MedicalCondition[];
    mentalHealthConditions: MedicalCondition[];
    currentMedications: Medication[];
    pastMedications: Medication[];
    surgicalHistory: SurgicalHistory[];
    hospitalizations: Hospitalization[];
    immunizationHistory: ImmunizationHistory[];
    familyHistory: FamilyHistory[];
    tobaccoUse: TobaccoStatus;
    alcoholUseDetails: string | null;
    recreationalDrugUseDetails: string | null;
    occupation: string | null;
    exerciseHabits: string | null;
    dietSummary: string | null;
    obGynHistory: ObGynHistory | null;
    bloodType: string | null;
    isOrganDonor: boolean | null;
    lastUpdated: Date | null;
}

// Form types for creating/editing
export interface ProductFormData {
    type: ProductType;
    name: string;
    commonName: string;
    description: string;
    price: number | null;
    priceAvacunar: number | null;
    priceVita: number | null;
    priceColsanitas: number | null;
    imageUrl: string;
    applicableDoctors: string[];
    minAge: number;
    maxAge: number;
    specialIndications: string | null;
    manufacturer: string | null;
    dosageInfo: string | null;
    targetDiseases: string | null;
    dosesAndBoosters: string | null;
    includedProductIds: string[] | null;
    includedDoseBundles: string[] | null;
    targetMilestone: string | null;
}

export interface ArticleFormData {
    title: string;
    excerpt: string;
    body: string;
    heroImageUrl: string;
    publishedAt: Date;
    category: ArticleCategory;
    tags: string[];
    author: string;
}

export interface LocationFormData {
    name: string;
    address: string;
}

export interface UserFormData {
    email: string;
    displayName: string | null;
    photoUrl: string | null;
    phoneNumber: string | null;
    isAdmin: boolean;
    userType: UserType;
    patientProfileIds: string[];
    preferredLocationId: string | null;
}

export interface PediatricianFormData {
    email: string;
    displayName: string | null;
    photoUrl: string | null;
    phoneNumber: string;
    isAdmin: boolean;
    specialty: string;
    licenseNumber: string;
    clinicLocationIds: string[];
    bio: string | null;
    yearsExperience: number | null;
}

export interface AppointmentFormData {
    patientId: string;
    patientName: string | null;
    doctorId: string;
    doctorName: string | null;
    doctorSpecialty: string | null;
    dateTime: Date;
    durationMinutes: number;
    locationId: string;
    locationName: string;
    locationAddress: string | null;
    type: AppointmentType;
    productIds: string[];
    status: AppointmentStatus;
    notes: string | null;
    createdByUserId: string | null;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Filter and search types
export interface ProductFilters {
    type?: ProductType;
    minPrice?: number;
    maxPrice?: number;
    minAge?: number;
    maxAge?: number;
    manufacturer?: string;
    search?: string;
}

export interface AppointmentFilters {
    status?: AppointmentStatus;
    type?: AppointmentType;
    doctorId?: string;
    locationId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
}

export interface UserFilters {
    userType?: UserType;
    isAdmin?: boolean;
    search?: string;
}

// Chart and analytics types
export interface AppointmentStats {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
}

export interface RevenueStats {
    total: number;
    byMonth: { month: string; amount: number }[];
    byProduct: { product: string; amount: number }[];
}

export interface UserStats {
    total: number;
    newThisMonth: number;
    activeThisMonth: number;
    byType: { type: UserType; count: number }[];
}

// Export all types
export type {
    BaseDocument,
    Product,
    ProductType,
    Article,
    ArticleCategory,
    Location,
    User,
    UserType,
    Pediatrician,
    Appointment,
    AppointmentType,
    AppointmentStatus,
    MedicalHistory,
    Allergy,
    MedicalCondition,
    Medication,
    SurgicalHistory,
    Hospitalization,
    ImmunizationHistory,
    FamilyHistory,
    ObGynHistory,
    Severity,
    AllergyType,
    ConditionStatus,
    MedicationType,
    Relationship,
    TobaccoStatus,
    ProductFormData,
    ArticleFormData,
    LocationFormData,
    UserFormData,
    PediatricianFormData,
    AppointmentFormData,
    ApiResponse,
    PaginatedResponse,
    ProductFilters,
    AppointmentFilters,
    UserFilters,
    AppointmentStats,
    RevenueStats,
    UserStats
};

export const productIconKeys = [
  'comida',
  'agua',
  'ropa',
  'calzado',
  'medicamentos',
  'higiene',
  'bebe',
  'panales',
  'cobijas',
  'utiles',
  'juguetes',
  'mascotas',
  'herramientas',
  'hogar',
  'libros',
  'transporte',
  'primeros_auxilios',
  'limpieza',
  'cocina',
  'energia',
  'comunicacion',
  'voluntarios',
  'mochila',
  'otro',
] as const;

export type ProductIconKey = (typeof productIconKeys)[number];
export type NeedType = 'product' | 'money';
export type NeedDocumentType = 'cc' | 'ce' | 'nit' | 'passport' | 'ti';

export interface NeedIconOption {
  key: string;
  label: string;
}

export const productIconOptions: NeedIconOption[] = [
  { key: 'comida', label: 'Comida' },
  { key: 'agua', label: 'Agua' },
  { key: 'ropa', label: 'Ropa' },
  { key: 'calzado', label: 'Calzado' },
  { key: 'medicamentos', label: 'Medicamentos' },
  { key: 'higiene', label: 'Higiene' },
  { key: 'bebe', label: 'Bebé' },
  { key: 'panales', label: 'Pañales' },
  { key: 'cobijas', label: 'Cobijas' },
  { key: 'utiles', label: 'Útiles' },
  { key: 'juguetes', label: 'Juguetes' },
  { key: 'mascotas', label: 'Mascotas' },
  { key: 'herramientas', label: 'Herramientas' },
  { key: 'hogar', label: 'Hogar' },
  { key: 'libros', label: 'Libros' },
  { key: 'transporte', label: 'Transporte' },
  { key: 'primeros_auxilios', label: 'Primeros auxilios' },
  { key: 'limpieza', label: 'Limpieza' },
  { key: 'cocina', label: 'Cocina' },
  { key: 'energia', label: 'Energía' },
  { key: 'comunicacion', label: 'Comunicación' },
  { key: 'voluntarios', label: 'Voluntarios' },
  { key: 'mochila', label: 'Mochila' },
  { key: 'otro', label: 'Otro' },
];

export const bankIconOption: NeedIconOption = {
  key: 'bank',
  label: 'Banco',
};

export const needTypeOptions = [
  { value: 'product', label: 'Producto' },
  { value: 'money', label: 'Dinero' },
];

export const documentTypeOptions = [
  { value: 'cc', label: 'CC' },
  { value: 'ce', label: 'CE' },
  { value: 'nit', label: 'NIT' },
  { value: 'passport', label: 'Pasaporte' },
  { value: 'ti', label: 'TI' },
];

export function getNeedIconLabel(iconKey: string | null | undefined) {
  if (iconKey === 'bank') {
    return bankIconOption.label;
  }
  return productIconOptions.find((option) => option.key === iconKey)?.label || 'Otro';
}

export function createEmptyNeedForm() {
  return {
    needType: 'product' as NeedType,
    iconKey: 'comida',
    name: '',
    description: '',
    hasLimit: false,
    targetQuantity: null as number | null,
    qrFile: null as File | null,
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    documentType: '' as NeedDocumentType | '',
    documentNumber: '',
  };
}

export type NeedFormItem = ReturnType<typeof createEmptyNeedForm>;

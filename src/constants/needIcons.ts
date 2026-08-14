export const productIconKeys = [
  'caja',
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
export type NeedType = 'product' | 'money' | 'talent';
export type NeedDocumentType = 'cc' | 'ce' | 'nit' | 'passport' | 'ti';

export interface NeedIconOption {
  key: string;
  label: string;
}

export const productIconOptions: NeedIconOption[] = [
  { key: 'caja', label: 'Caja' },
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
  { value: 'money', label: 'Donación' },
  { value: 'talent', label: 'Talento' },
];

export const needGroupOrder: Array<{ key: NeedType; title: string }> = [
  { key: 'talent', title: 'Talento' },
  { key: 'product', title: 'Productos' },
  { key: 'money', title: 'Donaciones' },
];

export const productCategoryOptions = [
  { value: 'cuidado_bienestar', label: 'Cuidado y bienestar' },
  { value: 'mascotas', label: 'Mascotas' },
  { value: 'movilidad', label: 'Movilidad' },
  { value: 'medicamentos', label: 'Medicamentos' },
  { value: 'alimentacion_hidratacion', label: 'Alimentación e hidratación' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'sin_categoria', label: 'Sin categoría' },
];

export const offerCategoryOptions = [
  { value: 'comida', label: 'Comida' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'productos', label: 'Productos' },
  { value: 'otro', label: 'Otro' },
];

export const MAX_MONEY_NEEDS = 3;
export const defaultProductIconKey = 'caja';
export const defaultTalentIconKey = 'voluntarios';
export const defaultProductCategoryKey = 'sin_categoria';

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

export function getNeedTypeLabel(needType: string | null | undefined) {
  if (needType === 'money') {
    return 'Donación';
  }
  if (needType === 'talent') {
    return 'Talento';
  }
  return 'Producto';
}

export function groupNeedsByType<T extends {
  needType: string;
  categoryKey?: string | null;
  categoryName?: string | null;
}>(needs: T[]) {
  return needGroupOrder
    .map((group) => {
      const items = needs.filter((need) => need.needType === group.key);
      return {
        ...group,
        items,
        subgroups: group.key === 'product' ? groupProductsByCategory(items) : null,
      };
    })
    .filter((group) => group.items.length);
}

export function groupProductsByCategory<T extends {
  categoryKey?: string | null;
  categoryName?: string | null;
}>(products: T[]) {
  const catalogKeys = new Set(productCategoryOptions.map((option) => option.value));
  const subgroups = productCategoryOptions
    .map((category) => ({
      key: category.value,
      title: category.label,
      items: products.filter((product) => {
        const categoryKey = product.categoryKey || defaultProductCategoryKey;
        return categoryKey === category.value;
      }),
    }))
    .filter((subgroup) => subgroup.items.length);

  const extraProducts = products.filter((product) => {
    const categoryKey = product.categoryKey || defaultProductCategoryKey;
    return !catalogKeys.has(categoryKey);
  });

  if (extraProducts.length) {
    subgroups.push({
      key: 'otras',
      title: 'Otras',
      items: extraProducts,
    });
  }

  return subgroups;
}

export function getOfferCategoryLabel(category: string | null | undefined) {
  return (
    offerCategoryOptions.find((option) => option.value === category)?.label ||
    category ||
    'Otro'
  );
}

export function groupOffersByCategory<T extends { category: string }>(offers: T[]) {
  const catalogKeys = new Set(offerCategoryOptions.map((option) => option.value));
  const subgroups = offerCategoryOptions
    .map((category) => ({
      key: category.value,
      title: category.label,
      items: offers.filter((offer) => offer.category === category.value),
    }))
    .filter((subgroup) => subgroup.items.length);

  const extraOffers = offers.filter((offer) => !catalogKeys.has(offer.category));
  if (extraOffers.length) {
    subgroups.push({
      key: 'otras',
      title: 'Otras',
      items: extraOffers,
    });
  }

  return subgroups;
}

export function getProductCategoryLabel(categoryKey: string | null | undefined) {
  return (
    productCategoryOptions.find((option) => option.value === categoryKey)?.label ||
    'Sin categoría'
  );
}

export function getNeedNameLabel(needType: NeedType) {
  if (needType === 'money') {
    return 'Nombre de la donación';
  }
  if (needType === 'talent') {
    return 'Nombre del talento';
  }
  return 'Nombre del producto';
}

export function createEmptyNeedForm(needType: NeedType = 'product') {
  return {
    needType,
    categoryKey: '',
    iconKey: needType === 'money' ? 'bank' : needType === 'talent' ? defaultTalentIconKey : defaultProductIconKey,
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

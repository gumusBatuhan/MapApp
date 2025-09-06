// src/messages/Messages.tr.ts
export const msg = {
  create: {
    success: "Kayıt eklendi.",
    fail:    "Kayıt eklenemedi.",
  },
  update: {
    success: "Kayıt güncellendi.",
    fail:    "Güncelleme başarısız.",
  },
  delete: {
    success: "Kayıt silindi.",
    fail:    "Silme başarısız.",
  },
  move: {
    success: "Konum güncellendi.",
    fail:    "Konum güncelleme başarısız.",
  },
  validation: {
    enumRequired: "Lütfen Tür (Yol/Bina) seçiniz.",
    nameRequired: "Lütfen ad giriniz.",
    nameMax: (n: number) => `Ad en fazla ${n} karakter olabilir.`,
    onlyType: (label: string) => `Bu konumda sadece "${label}" türünde point ekleyebilirsin.`,
    geom: {
      jsonInvalid: "Koordinatlar geçerli değil. Örnek: Point için [30.5, 41.0]",
      pointInvalid:
        "Geometri formatı geçersiz veya Point için beklenen [x, y] dizisi değil.",
      lineStringInvalid:
        "Geometri formatı geçersiz veya LineString için beklenen [[x,y], [x,y], ...] dizisi değil.",
      polygonInvalid:
        "Geometri formatı geçersiz veya Polygon için beklenen [[[x,y], ...], ...] dizisi değil.",
    },
  },
  common: {
    unexpected: "Beklenmeyen bir hata oluştu.",
  },
} as const;

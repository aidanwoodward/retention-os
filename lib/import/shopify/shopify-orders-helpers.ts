/**
 * Pure helpers for Shopify Orders CSV → RetentionOS canonical mapping.
 */

/** Normalise Shopify export header cells to lookup keys (matches `normalise-orders` convention). */
export function normaliseShopifyHeaderName(cell: string): string {
  return cell.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isBlankCell(raw: string): boolean {
  return raw.trim() === "";
}

/** Prefer Shopify `Id`; fallback to `Name` with leading `#` stripped. */
export function resolveShopifyOrderId(idRaw: string, nameRaw: string): string {
  const id = idRaw.trim();
  if (id !== "") return id;
  return nameRaw.trim().replace(/^#+/, "").trim();
}

/** Browser-session customer key: lowercase email. */
export function normalizeShopifyCustomerEmail(emailRaw: string): string {
  return emailRaw.trim().toLowerCase();
}

/**
 * Product key fallback when SKU absent: trim → lowercase → collapse whitespace →
 * replace non-alphanumeric runs with `_`.
 */
export function normalizeShopifyProductKeyFromName(nameRaw: string): string {
  const collapsed = nameRaw.trim().toLowerCase().replace(/\s+/g, " ");
  return collapsed.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function resolveShopifyProductId(skuRaw: string, nameRaw: string): { productId: string; sku: string } {
  const skuTrim = skuRaw.trim();
  if (skuTrim !== "") {
    return { productId: skuTrim, sku: skuTrim };
  }
  return { productId: normalizeShopifyProductKeyFromName(nameRaw), sku: "" };
}

/** Order-level money cell: blank → `"0"` for required discount/refund columns. */
export function shopifyMoneyCellOrZero(raw: string): string {
  return isBlankCell(raw) ? "0" : raw.trim();
}

/** Format derived money for canonical string fields. */
export function formatDerivedMoney(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  return amount.toFixed(2);
}

export function hasLineitemFields(quantity: string, name: string, price: string): boolean {
  return !isBlankCell(quantity) || !isBlankCell(name) || !isBlankCell(price);
}

export function hasOrderAnchorFields(id: string, name: string): boolean {
  return !isBlankCell(id) || !isBlankCell(name);
}

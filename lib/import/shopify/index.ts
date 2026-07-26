export {
  SHOPIFY_ORDERS_OPTIONAL_SKU_HEADER,
  SHOPIFY_ORDERS_OPTIONAL_SOURCE_HEADER,
  SHOPIFY_ORDERS_ORDER_ID_HEADERS,
  SHOPIFY_ORDERS_REQUIRED_HEADERS,
  SHOPIFY_ORDERS_TOTAL_HEADER,
  type ShopifyOrdersRequiredHeader,
} from "./shopify-orders-schema";

export {
  formatDerivedMoney,
  hasLineitemFields,
  hasOrderAnchorFields,
  isBlankCell,
  normalizeShopifyCustomerEmail,
  normalizeShopifyProductKeyFromName,
  normaliseShopifyHeaderName,
  resolveShopifyOrderId,
  resolveShopifyProductId,
  shopifyMoneyCellOrZero,
} from "./shopify-orders-helpers";

export { parseShopifyOrdersCsvText, type ParseShopifyOrdersCsvResult } from "./parse-shopify-orders-csv";

export { importShopifyOrdersCsvFromText } from "./import-shopify-orders-csv";

export {
  adaptShopifyGraphqlOrdersFixture,
  buildFixtureRetentionOSDataset,
  GRAPHQL_FIXTURE_TEST_META,
} from "./graphql";
export type {
  ShopifyGraphqlAdaptResult,
  ShopifyGraphqlAdaptStatus,
  ShopifyGraphqlCompleteness,
  ShopifyGraphqlEntityOutput,
  ShopifyGraphqlImportIssue,
  ShopifyGraphqlOrderDisposition,
  ShopifyGraphqlOrderNode,
  ShopifyGraphqlOrdersFixtureInput,
} from "./graphql";

import { Address } from 'viem';

export interface Listing {
  id: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    files?: {
      images: { url: string }[];
      videos: { url: string }[];
      other: { url: string }[];
    };
    external_url?: string;
    attributes?: {
      trait_type: string;
      value: string;
      description?: string;
    }[];
  };
  base_price: {
    currency: Address;
    amount: string;
  };
  chain: string;
  seller_id: string;
  listing_parameters_schema: any; // JSONSchemaType
}

export interface OnChainParameters {
  seller_id: string;
  currency: Address;
  amount: string;
  deadline: number;
}

export interface Order {
  items: {
    listing: Listing;
    variable_costs: {
      items: {
        name: string;
        description?: string;
        amount: string;
      }[];
    };
    listing_parameters: object;
  }[];
  variable_costs: {
    items: {
      name: string;
      description?: string;
      amount: string;
    }[];
  };
  order_parameters: object;
  on_chain_parameters: OnChainParameters;
  nonce: string;
}

export interface ListingResponse {
  listings: Listing[];
}

export interface OrderResponse {
  order: Order;
  order_hash: string;
  on_chain_parameters_signature: string;
}

export interface SellerMetadata {
  name: string;
  description?: string;
  contact?: {
    email: string;
    [key: string]: string;
  };
  categories: string[];
  supported_uid_schemas: object[];
}

export interface OrderParametersSchema {
  orderParametersSchema: object;
} 
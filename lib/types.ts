export interface Document {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureBox {
  id: string;
  document_id: string;
  signer_email: string;
  page: number;
  x: number;
  y: number;
  width: number;
  aspect_ratio: number;
  created_at: string;
}

export interface DocumentSigner {
  id: string;
  document_id: string;
  signer_id: string;
  signer_email: string;
  signature_data: string | null;
  signed_at: string | null;
  status: 'pending' | 'signed';
  created_at: string;
}

export interface DocumentWithSigners extends Document {
  document_signers: DocumentSigner[];
  signature_boxes: SignatureBox[];
}

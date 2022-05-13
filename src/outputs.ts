import { BulkRedirectListItem } from "."

const listApi = `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}/items`

export interface BulkUploadReport {
  success: boolean;
  operation_id?: string;
  errors: any[];
  messages: any[];
  invalid_rules: BulkRedirectListItem[];
}

export const uploadBulkList = async (list: BulkRedirectListItem[]): Promise<any> => {
  const response: any = await fetch(listApi, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    },
    body: JSON.stringify(list),
  }).then(res => res.json());

  const report: BulkUploadReport = {
    success: response?.success || false,
    operation_id: response?.result?.operation_id || undefined,
    errors: response?.errors || null,
    messages: response?.messages || null,
    invalid_rules: [],
  };

  if (response?.errors?.length) {
    report.invalid_rules = response.errors.map((e: any) => {
      return list[e.source.parameter_value_index];
    });
  }

  return report;
};

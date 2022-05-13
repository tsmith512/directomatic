import { BulkRedirectListItem } from "."

const listApi = `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}/items`

export const uploadBulkList = async (list: BulkRedirectListItem[]): Promise<any> => {
  const response: any = await fetch(listApi, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    },
    body: JSON.stringify(list),
  }).then(res => res.json());

  return {
    success: response?.success || false,
    operation: response?.result?.operation_id || null,
    errors: response?.errors || null,
    messages: response?.messages || null,
  };
};

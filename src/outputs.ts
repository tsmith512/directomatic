import { BulkRedirectListItem } from "."

const listApi = `${CF_API_ENDPOINT}/accounts/${CF_ACCT_ID}/rules/lists/${CF_LIST_ID}/items`

export const uploadBulkList = async (list: BulkRedirectListItem[]): Promise<any> => {
  const response = await fetch(listApi, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${CF_API_TOKEN}`,
    },
    body: JSON.stringify(list),
  }).then(res => res.json())

  console.log(JSON.stringify(response));

  return response;
};

const ASSIGNEE_PALETTE = [
  { bg: '#d9ead3', text: '#274e13', border: '#6aa84f' },
  { bg: '#fce5cd', text: '#7f6000', border: '#e69138' },
  { bg: '#d0e0e3', text: '#0c343d', border: '#76a5af' },
  { bg: '#f4cccc', text: '#7f1d1d', border: '#cc5c5c' },
  { bg: '#d9d2e9', text: '#3d2a7a', border: '#8e7cc3' },
  { bg: '#fff2cc', text: '#7f6a00', border: '#d6b656' },
];

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getAssigneeColors = (userId?: string | null) => {
  if (!userId) {
    return { bg: '#f2f2f2', text: '#1f1f1f', border: '#3a3a3a' };
  }

  const index = hashString(userId) % ASSIGNEE_PALETTE.length;
  return ASSIGNEE_PALETTE[index];
};

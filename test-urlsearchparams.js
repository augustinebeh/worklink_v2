// Test URLSearchParams with undefined
const params = { status: undefined };
const searchParams = new URLSearchParams(params);
console.log('Result:', searchParams.toString());
console.log('URL would be:', `/api/v1/jobs?${searchParams.toString()}`);

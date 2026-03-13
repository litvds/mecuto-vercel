import bcrypt from "bcryptjs";

const plain = process.argv[2];
if (!plain) {
  console.log('Использование: node tools/make_password_hash.mjs "MyPassword123"');
  process.exit(1);
}
const hash = bcrypt.hashSync(String(plain), 10);
console.log("\nПароль:");
console.log(plain);
console.log("\nХэш для Google Sheets:");
console.log(hash);

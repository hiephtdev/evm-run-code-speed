## Hướng dẫn call nhanh 1 evm function ##

### Cài node js nếu chưa cài ###

1. Thay đổi rpc, contract cần call tại `.evn`

2. Tạo file `wallet.txt` => đúng như tên trong giá trị `FILE_WALLET` nếu thay đổi thì tạo thay đổi lại, theo định dạng `address|private|seed` seed có thể điền bừa gì cũng được, mỗi ví 1 dòng

```js
addrees1|private1|xxx
addrees2|private2|xxx
addrees3|private3|xxx
```

3. Gõ lệnh dưới để chạy sau khi đã cấu hình đủ

```bash
node ./src/main.js
```
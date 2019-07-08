cvmfs._pkcs8_keys = [
/* emscripten.cvmfs.io */
'-----BEGIN PUBLIC KEY-----\
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5ZQxnVi11Pe0gZFXTYjn\
dWHNMZmpMt51C9WjKIIpP4xGWpddWgCjjnIIeGyeqAlHgXB7UiQ6v6m6qN3+JLzB\
lnpV+Vk6U6bis1qJtH8ffhqwfPoJvfszze0/AnZlVm5e0PcicCLOc10ndFScq/Uy\
z6avFicgrQNNayIyT6bIP/grldh8U5nc4nKf8F0aGTtIa6he0qb5h0fxBcjCCD2h\
aEbkq4jfGZ1KXwu9tqJSLEz1mCa10DYN1yLNe2qPDv5hdZ2hiLNZEYFmWwi/RT54\
FiKZ4IagLdkzywFoSoQtIBG/kfz6k5SIs/dCySiSjKwp/xW7Bvmr3Fvm8EZm8rQ7\
ZQIDAQAB\
-----END PUBLIC KEY-----'
];

cvmfs.getMasterKeys = function() {
  if (cvmfs._master_keys === null) {
    cvmfs._master_keys = cvmfs._pkcs8_keys.map(function (pkcs_key) {
      return KEYUTIL.getKey(pkcs_key);
    });
  }
  return cvmfs._master_keys;
}

cvmfs.addMasterKey = function(pkcs_key) {
  const master_keys = cvmfs.getMasterKeys();
  master_keys.push(KEYUTIL.getKey(pkcs_key));
  cvmfs._master_keys = master_keys;
};


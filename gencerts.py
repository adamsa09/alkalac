import re

def extract_pem_blocks(path):
    with open(path, 'r') as f:
        content = f.read()
    blocks = re.findall(r'-----BEGIN[^-]+-----[^-]+-----END[^-]+-----', content, re.DOTALL)
    return '\n'.join(b.strip() for b in blocks) + '\n'

def pem_to_c(path, var):
    pem = extract_pem_blocks(path)
    lines = pem.strip().split('\n')
    out = f'const char {var}[] =\n'
    for line in lines:
        out += f'  "{line}\\n"\n'
    return out + ';\n\n'

with open('certs.h', 'w') as f:
    f.write('#pragma once\n\n')
    f.write(pem_to_c('main/certs/ca.pem',     'ca_pem'))
    f.write(pem_to_c('main/certs/client.crt', 'client_crt'))
    f.write(pem_to_c('main/certs/client.key', 'client_key'))

print("Done: certs.h")


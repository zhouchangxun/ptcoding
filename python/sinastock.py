#!/usr/bin/python3

import re
import sys
import urllib.request, urllib.error, urllib.parse

reg = re.compile(r'var hq_str_[szh]{2}\d{6}="(.+?)";\n')

def a_stock(num):
    req = urllib.request.Request("http://hq.sinajs.cn/list=%s" % num)
    data = urllib.request.urlopen(req).read().decode('gbk')
    #with open('/tmp/st.txt', 'rb') as f: data = f.read().decode('gbk')
    
    stval = reg.findall(data)
    stall = tuple(map(lambda q:tuple(q.split(',')), stval))

    return stall




if __name__ == '__main__':

    num_fn = sys.argv[1]

    with open(num_fn, 'rb') as f:
        nums = f.read()
        num_re = re.compile(b"[szh]{2}\d{6}")

        file_num = num_re.findall(nums)
        stock_num = ",".join(map(lambda z:z.decode('ascii'), file_num))
        stall = a_stock(stock_num)

        for q in stall:
            #for n,v in enumerate(q): print (n,v)
            name = q[0]
            curval = q[3]
            if float(curval) == 0:
                curval = q[2]

            print("{0} \t {1} {2}".format(curval, name, q[31]))

        print("---------")
        

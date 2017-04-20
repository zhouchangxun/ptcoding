#!/usr/bin/env bash
# Bash3 Boilerplate. Copyright (c) 2014, kvz.io

set -o errexit
set -o pipefail
set -o nounset
# set -o xtrace

PORT="${1:-}"

setconfig () {

    if ! echo $PORT | grep -q -E "^5[0-9]{4}$"; then
        while true; do
            echo "Enter mapping port number: (must be greater than 50000)"

            if ! tty --silent; then
                read PORT < /dev/tty
            else
                read PORT
            fi

            if echo $PORT | grep -q -E "^5[0-9]{4}$"; then
                break;
            fi
        done
    fi

    echo "Mapping remote port $PORT"

    cat > /etc/ngrok.yml << EOF
server_addr: "ittun.com:44433"
tunnels: 
    ssh:
        remote_port: $PORT
        proto:
            tcp: ":22"
EOF

    echo "---------------------"
}

ARCH=$(uname -m)
ITTUN_URL=http://www.ittun.com/upload/17.4/

if [ $ARCH == "x86_64" ]; then
    FILE=linux64.zip
elif [ $ARCH == "i686" ]; then
    FILE=linux32.zip
else
    echo "Arch unsupported"
    exit 1
fi

if command -v curl > /dev/null 2>&1; then
    DOWNLOAD="curl -O"
elif command -v wget > /dev/null 2>&1; then
    DOWNLOAD="wget"
else
    echo "wget or curl not exists."
    exit 1
fi


setconfig
echo "Selected $FILE";
URL=${ITTUN_URL}${FILE}
cd /tmp
if [[ ! -e /tmp/$FILE ]]; then
    exec $DOWNLOAD $URL
fi
unzip $FILE
UNDIR=${FILE%.*}
install -v -m755 ./$UNDIR/ngrok /usr/local/bin/
rm -rf $UNDIR

sed -i -e '$i \ngrok -log=stdout -config=/etc/ngrok.yml start ssh >/dev/null 2>&1 &\n' /etc/rc.local
echo "---------------------"
ngrok -log=stdout -config=/etc/ngrok.yml start ssh >/dev/null 2>&1 &
echo "Done"

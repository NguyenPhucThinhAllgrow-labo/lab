FROM debian:bookworm-slim AS builder

ARG PIKAFISH_REF=99793311968f59cf5be2dd03f646b25ab8ab56e3
ARG PIKAFISH_ARCH=x86-64-sse41-popcnt
ARG PIKAFISH_NNUE_SHA256=7d13d73569a9b571ba0eb20cf1596247bc2a42738967e61afef6482b231e900e

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates g++ git make wget \
    && rm -rf /var/lib/apt/lists/*

RUN git init /src/pikafish \
    && git -C /src/pikafish remote add origin https://github.com/official-pikafish/Pikafish.git \
    && git -C /src/pikafish fetch --depth 1 origin "${PIKAFISH_REF}" \
    && git -C /src/pikafish checkout --detach FETCH_HEAD \
    && wget -q https://github.com/official-pikafish/Networks/releases/download/master-net/pikafish.nnue -O /src/pikafish/src/pikafish.nnue \
    && echo "${PIKAFISH_NNUE_SHA256}  /src/pikafish/src/pikafish.nnue" | sha256sum -c - \
    && make -C /src/pikafish/src -j"$(nproc)" build ARCH="${PIKAFISH_ARCH}" \
    && strip /src/pikafish/src/pikafish

FROM python:3.13-slim-bookworm

WORKDIR /opt/pikafish

COPY --from=builder /src/pikafish/src/pikafish /opt/pikafish/pikafish
COPY --from=builder /src/pikafish/src/pikafish.nnue /opt/pikafish/pikafish.nnue
COPY --from=builder /src/pikafish/Copying.txt /opt/pikafish/Copying.txt
COPY docker/pikafish/server.py /opt/pikafish/server.py

RUN useradd --system --home /opt/pikafish pikafish \
    && chown -R pikafish:nogroup /opt/pikafish

USER pikafish
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3)"

CMD ["python3", "/opt/pikafish/server.py"]

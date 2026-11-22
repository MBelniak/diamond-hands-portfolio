# 0002. Lokalny deployment z dockerem

- Status: Accepted
- Data: 2026-11-22

## Kontekst

- Aplikacja korzysta ze zdalnego Redisa. Lokalny development zależał od zewnętrznej usługi.
- Docker będzie potrzebny w dalszych fazach: LocalStack i sam local.
- Na AWS aplikacja nie będzie działać w kontenerze, bo front idzie na S3 + CloudFront, a backend na Lambdy. Docker służy tu do developmentu, nie do produkcji.

## Decyzja

- docker-compose.yml z dwoma serwisami: redis (named volume na /data) i app.
- Dockerfile z trzema etapami (deps, build, runtime), Next.js w trybie standalone, uruchamiany jako użytkownik node.
- Podział zmiennych:
  - publiczne (NEXT\_PUBLIC\_\*) w .env.public, kopiowane jako .env.production przy buildzie,
  - sekrety tylko przy uruchomieniu, przez env\_file. Nigdy w ARG, ENV ani w warstwach obrazu.
- Obraz na node:24-alpine, czyli ta sama główna wersja Node co lokalnie.
- Adres Redisa przez zmienną środowiskową, a nie zaszyty w obrazie.

## Rozważane alternatywy

- Zostać przy zdalnym Redisie: zależność od sieci i współdzielony stan z produkcją
- Redis zainstalowany natywnie na Windowsie: brak oficjalnego wsparcia, a do tego nie uczy Dockera
- Sekrety przez ARG: odrzucone, bo zostają w historii obrazu.

# Konsekwencje

- Odkryte problemy:
  - inicjalizacja bazy przy imporcie layoutu, czyli w build time, przeniesiona do instrumentation.ts,
  - różnica Node 26 a 24 powodowała błąd undici w node-appwrite,
  - setSelfSigned(true) wyłączał weryfikację TLS i został usunięty.

- Obraz ma 412 MB, bo tracing Next wciąga do standalone całe repo. Optymalizacja odłożona.
- Lekcja: opcjonalna zależność, taka jak cache, potrzebuje timeoutu i fallbacku. Padnięty Redis zawieszał zapytania.

## Przy skali

- Obraz do rejestru (ECR), skan podatności i przypięty digest obrazu bazowego, jeśli aplikacja kiedyś pójdzie na kontenery (ECS/Fargate).
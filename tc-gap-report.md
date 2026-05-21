# TC ↔ ATC Gap Report

Excel: `/Users/a1/Downloads/test_cases_export_2026-05-19 (1).xlsx` (1804 TCs)
ATC files: `atcs/**/*.atc.yml` (189 files)

## 표기

- ✅ 같은 영역에 키워드 3개 이상 겹치는 ATC 존재 — **이미 작성됐을 가능성 높음** (검토 필요)
- ⚠️ 같은 영역에 키워드 1-2개 겹치는 ATC 존재 — **부분 작성**일 가능성, 다른 시나리오일 수 있음
- ❌ 해당 영역 ATC 중에 키워드 매칭이 0건 — **거의 확실히 미작성**
- ❌(no atc area) 해당 Main Category 자체에 ATC 가 한 건도 없음 — **영역 전체 미작성**

## 1. 영역별 요약


| Category / Main      | Total    | ✅       | ⚠️      | ❌       | ❌(no area) |
| -------------------- | -------- | ------- | ------- | ------- | ---------- |
| 일반 / 수집상품            | 303      | 75      | 228     | 0       | 0          |
| 일반 / 상품수집            | 295      | 113     | 133     | 49      | 0          |
| 일반 / 등록상품            | 193      | 95      | 98      | 0       | 0          |
| 일반 / 배송대행지           | 178      | 172     | 6       | 0       | 0          |
| 일반 / 업로드             | 102      | 0       | 45      | 57      | 0          |
| 일반 / 연결설정            | 57       | 6       | 39      | 12      | 0          |
| 일반 / 기본설정            | 57       | 57      | 0       | 0       | 0          |
| 스스관부가세 / 업로드설정       | 42       | 0       | 0       | 0       | 42         |
| 일반 / 설정              | 41       | 0       | 0       | 0       | 41         |
| 스스관부가세 / 등록상품        | 40       | 35      | 5       | 0       | 0          |
| 일반 / 온보딩             | 37       | 0       | 0       | 0       | 37         |
| 일반 / 유입수 분석          | 37       | 0       | 0       | 0       | 37         |
| 일반 / 주문관리            | 33       | 7       | 26      | 0       | 0          |
| 스스관부가세 / 수집상품        | 30       | 11      | 19      | 0       | 0          |
| 일반 / ai 챗봇           | 29       | 0       | 0       | 0       | 29         |
| 일반 / 재고업데이트          | 28       | 0       | 0       | 0       | 28         |
| 스스관부가세 / 기본설정        | 27       | 12      | 15      | 0       | 0          |
| 인 상 추 / 상품추천         | 27       | 0       | 0       | 0       | 27         |
| 일반 / 연결 설정           | 22       | 2       | 20      | 0       | 0          |
| 일반 / AI 전세계 상품수집     | 20       | 0       | 0       | 0       | 20         |
| 일반 / 플랜결제            | 18       | 0       | 0       | 0       | 18         |
| 일반 / 상품 순위 분석        | 16       | 0       | 0       | 0       | 16         |
| 일반 / 문의관리            | 16       | 0       | 0       | 0       | 16         |
| 일반 / 취소/교환/반품 관리     | 15       | 0       | 0       | 0       | 15         |
| 일반 / 윈들리             | 15       | 0       | 4       | 11      | 0          |
| 일반 / 로그인             | 11       | 0       | 0       | 0       | 11         |
| 인기 상품 추천 개선 / 상품카드   | 11       | 0       | 0       | 0       | 11         |
| AI 대표이미지 생성 / 사용량정책  | 11       | 0       | 0       | 0       | 11         |
| 일반 / 상세페이지           | 10       | 0       | 0       | 0       | 10         |
| 인기 상품 추천 개선 / 유사상품   | 9        | 0       | 0       | 0       | 9          |
| 인기 상품 추천 개선 / 추천키워드  | 8        | 0       | 0       | 0       | 8          |
| AI 대표이미지 생성 / AI생성모달 | 8        | 0       | 0       | 0       | 8          |
| AI 대표이미지 생성 / 이미지생성  | 6        | 0       | 0       | 0       | 6          |
| 일반 / 회원가입            | 5        | 0       | 0       | 0       | 5          |
| 일반 / 상품              | 5        | 0       | 0       | 0       | 5          |
| 일반 / 홈               | 4        | 0       | 0       | 0       | 4          |
| 일반 / 수집              | 4        | 0       | 0       | 0       | 4          |
| 인기 상품 추천 개선 / 로딩오류   | 4        | 0       | 0       | 0       | 4          |
| 일반 / 게정관리            | 3        | 0       | 0       | 0       | 3          |
| 일반 / 공통설정            | 3        | 0       | 0       | 0       | 3          |
| 인기 상품 추천 개선 / 해상도    | 3        | 0       | 0       | 0       | 3          |
| 인기 상품 추천 개선 / 트래킹    | 3        | 0       | 0       | 0       | 3          |
| AI 대표이미지 생성 / 진입버튼   | 3        | 0       | 0       | 0       | 3          |
| AI 대표이미지 생성 / 이미지편집  | 3        | 0       | 0       | 0       | 3          |
| AI 대표이미지 생성 / 트래킹    | 3        | 0       | 0       | 0       | 3          |
| 일반 / 계정              | 2        | 0       | 0       | 0       | 2          |
| 일반 / 상품 복제           | 2        | 0       | 0       | 0       | 2          |
| AI 대표이미지 생성 / 이미지탭   | 2        | 0       | 0       | 0       | 2          |
| 일반 / 내 계정            | 1        | 0       | 0       | 0       | 1          |
| 일반 / 상품상세            | 1        | 0       | 0       | 0       | 1          |
| 일반 / 계정 관리d          | 1        | 0       | 0       | 0       | 1          |
| **TOTAL**            | **1804** | **585** | **638** | **129** | **452**    |


## 2. 영역 전체 미작성 (해당 Main Category 에 ATC 0건)

이 영역들은 ATC 1건도 없음 — 모든 TC 가 미작성. 우선순위 P0/P1 부터 작성 권장.


| Category / Main      | TC 수 | P0  | P1  | P2  |
| -------------------- | ---- | --- | --- | --- |
| 스스관부가세 / 업로드설정       | 42   | 12  | 26  | 4   |
| 일반 / 설정              | 41   | 20  | 19  | 2   |
| 일반 / 온보딩             | 37   | 0   | 0   | 37  |
| 일반 / 유입수 분석          | 37   | 4   | 0   | 33  |
| 일반 / ai 챗봇           | 29   | 9   | 0   | 20  |
| 일반 / 재고업데이트          | 28   | 0   | 0   | 28  |
| 인 상 추 / 상품추천         | 27   | 0   | 0   | 27  |
| 일반 / AI 전세계 상품수집     | 20   | 13  | 2   | 5   |
| 일반 / 플랜결제            | 18   | 15  | 0   | 3   |
| 일반 / 상품 순위 분석        | 16   | 0   | 0   | 16  |
| 일반 / 문의관리            | 16   | 0   | 0   | 16  |
| 일반 / 취소/교환/반품 관리     | 15   | 0   | 0   | 15  |
| 일반 / 로그인             | 11   | 0   | 0   | 11  |
| 인기 상품 추천 개선 / 상품카드   | 11   | 0   | 8   | 3   |
| AI 대표이미지 생성 / 사용량정책  | 11   | 8   | 2   | 1   |
| 일반 / 상세페이지           | 10   | 8   | 2   | 0   |
| 인기 상품 추천 개선 / 유사상품   | 9    | 7   | 0   | 2   |
| 인기 상품 추천 개선 / 추천키워드  | 8    | 6   | 0   | 2   |
| AI 대표이미지 생성 / AI생성모달 | 8    | 0   | 0   | 8   |
| AI 대표이미지 생성 / 이미지생성  | 6    | 5   | 0   | 1   |
| 일반 / 회원가입            | 5    | 0   | 0   | 5   |
| 일반 / 상품              | 5    | 5   | 0   | 0   |
| 일반 / 홈               | 4    | 0   | 0   | 4   |
| 일반 / 수집              | 4    | 4   | 0   | 0   |
| 인기 상품 추천 개선 / 로딩오류   | 4    | 0   | 0   | 4   |
| 일반 / 게정관리            | 3    | 0   | 0   | 3   |
| 일반 / 공통설정            | 3    | 1   | 0   | 2   |
| 인기 상품 추천 개선 / 해상도    | 3    | 0   | 0   | 3   |
| 인기 상품 추천 개선 / 트래킹    | 3    | 2   | 1   | 0   |
| AI 대표이미지 생성 / 진입버튼   | 3    | 2   | 0   | 1   |
| AI 대표이미지 생성 / 이미지편집  | 3    | 3   | 0   | 0   |
| AI 대표이미지 생성 / 트래킹    | 3    | 0   | 3   | 0   |
| 일반 / 계정              | 2    | 2   | 0   | 0   |
| 일반 / 상품 복제           | 2    | 2   | 0   | 0   |
| AI 대표이미지 생성 / 이미지탭   | 2    | 1   | 0   | 1   |
| 일반 / 내 계정            | 1    | 1   | 0   | 0   |
| 일반 / 상품상세            | 1    | 0   | 1   | 0   |
| 일반 / 계정 관리d          | 1    | 0   | 0   | 1   |


## 3. 부분 작성 영역의 미작성 TC 목록

아래는 ⚠️(부분 매칭) + ❌(영역 내 매칭 없음) 인 TC 들. **이미 만든 ATC와 다른 시나리오일 가능성이 높음** — 매칭 ATC 가 정말로 같은 케이스인지 직접 확인 필요.

### 일반 / 수집상품  (228 미작성 / 303 TCs)


| TC# | P   | Sub / Func           | Title                        | 상태  | 유사 ATC                                  |
| --- | --- | -------------------- | ---------------------------- | --- | --------------------------------------- |
| 826 | P0  | 업로드설정 / esm          | 상품수집 후 업로드 설정 확인             | ⚠️  | collect/ai-recommend-category           |
| 827 | P0  | 업로드설정 / esm          | 카테고리 수정 후 업로드 설정 확인          | ⚠️  | collect/ai-recommend-category           |
| 831 | P0  | 상세페이지 / AI 상품 설명     | 버튼 호버                        | ⚠️  | collect/ai-recommend-category           |
| 832 | P0  | 상세페이지 / AI 상품 설명     | 버튼 선택                        | ⚠️  | collect/ai-recommend-category           |
| 833 | P0  | 상세페이지 / AI 상품 설명     | 모달 확인                        | ⚠️  | collect/ai-recommend-category           |
| 835 | P0  | 상세페이지 / AI 상품 설명     | 상세페이지에 추가                    | ⚠️  | collect/ai-recommend-category           |
| 836 | P0  | 상세페이지 / AI 상품 설명     | 상세페이지에 추가                    | ⚠️  | collect/ai-recommend-category           |
| 837 | P0  | 상세페이지 / AI 상품 설명     | 기본설정에서 적용                    | ⚠️  | collect/ai-recommend-category           |
| 838 | P0  | 상세페이지 / AI 상품 설명     | 툴팁 확인                        | ⚠️  | collect/ai-recommend-category           |
| 850 | P0  | 옵션탭 / 옵션그룹           | 옵션그룹 삭제                      | ⚠️  | collect/ai-recommend-category           |
| 851 | P0  | 옵션탭 / 옵션그룹           | 체크박스 선택 후 삭제                 | ⚠️  | collect/ai-recommend-category           |
| 852 | P0  | 옵션탭 / 옵션그룹           | 삭제 재시도                       | ⚠️  | collect/ai-recommend-category           |
| 853 | P0  | 옵션탭 / 옵션             | 옵션 삭제                        | ⚠️  | collect/edit-option-price               |
| 854 | P0  | 옵션탭 / 옵션             | 체크박스 선택 후 삭제                 | ⚠️  | collect/edit-option-price               |
| 855 | P0  | 옵션탭 / 옵션             | 삭제 재시도                       | ⚠️  | collect/edit-option-price               |
| 859 | P0  | 업로드 / 마켓상품           | 상품 업로드 후 확인                  | ⚠️  | collect/change-page-size                |
| 860 | P0  | 업로드 / 마켓상품           | 상품 업로드 후 확인                  | ⚠️  | collect/change-page-size                |
| 861 | P0  | 상품상세 / 카테고리          | 상품수집 시 카테고리 확인               | ⚠️  | collect/ai-recommend-category           |
| 863 | P0  | 이미지탭 / 이미지 복사        | 이미지 붙여넣기 버튼 확인               | ⚠️  | collect/ai-recommend-category           |
| 864 | P0  | 이미지탭 / 이미지 복사        | 일괄 붙여넣기 버튼 호버                | ⚠️  | collect/bulk-apply-base-setting         |
| 865 | P0  | 이미지탭 / 이미지 복사        | 일괄 붙여넣기 버튼 선택                | ⚠️  | collect/bulk-apply-base-setting         |
| 867 | P0  | 상품상세 / esm 2.0       | 옵션 모드 모달 확인                  | ⚠️  | collect/edit-option-price               |
| 868 | P0  | 상품상세 / esm 2.0       | 옵션 모드 모달 확인                  | ⚠️  | collect/edit-option-price               |
| 869 | P0  | 상품상세 / esm 2.0       | 옵션 모드 모달 확인                  | ⚠️  | collect/edit-option-price               |
| 931 | P0  | 엑셀 수집 / 엑셀 수집        | 엑셀 수집                        | ⚠️  | collect/ai-recommend-category           |
| 943 | P0  | 상품상세 / 상품리스크진단       | 리스크가 없을 때 답변 확인              | ⚠️  | collect/ai-recommend-category           |
| 944 | P0  | 상품상세 / 상품리스크진단       | 리스크가 없을 때 답변 확인              | ⚠️  | collect/ai-recommend-category           |
| 945 | P0  | 상품상세 / 상품리스크진단       | 리스크가 없을 때 답변 확인              | ⚠️  | collect/ai-recommend-category           |
| 946 | P0  | 상품상세 / 상품리스크진단       | 리스크가 없을 때 답변 확인              | ⚠️  | collect/ai-recommend-category           |
| 947 | P0  | 상품상세 / 상품리스크진단       | 리스크가 없을 때 답변 확인              | ⚠️  | collect/ai-recommend-category           |
| 963 | P0  | 이미지 / 배경지우기          | 벌크 이미지 배경지우기                 | ⚠️  | collect/bulk-apply-base-setting         |
| 964 | P0  | 이미지 / 배경지우기          | 단건 이미지 배경지우기                 | ⚠️  | collect/ai-recommend-name               |
| 828 | P1  | 업로드설정 / esm          | 옵션 수정 후 업로드 설정 확인            | ⚠️  | collect/ai-recommend-category           |
| 829 | P1  | 업로드설정 / esm          | 옵션 그룹 수정 후 업로드 설정 확인         | ⚠️  | collect/ai-recommend-category           |
| 830 | P1  | 상세페이지 / AI 상품 설명     | 상세페이지 탭에서 AI 상품 설명 버튼 확인     | ⚠️  | collect/ai-recommend-category           |
| 834 | P1  | 상세페이지 / AI 상품 설명     | 설명 확인                        | ⚠️  | collect/ai-recommend-category           |
| 839 | P1  | 상세페이지 / AI 상품 설명     | 기본설정 후 상품수집                  | ⚠️  | collect/ai-recommend-category           |
| 348 | P2  | 아마존 / 설정             | 수집상품 페이지 진입                  | ⚠️  | collect/ai-recommend-category           |
| 349 | P2  | 아마존 / 설정             | 수집상품 페이지 진입                  | ⚠️  | collect/ai-recommend-category           |
| 350 | P2  | 아마존 / 설정             | 상품명 검색                       | ⚠️  | collect/ai-recommend-name               |
| 351 | P2  | 아마존 / 설정             | 상품 코드 검색                     | ⚠️  | collect/search-product-by-code          |
| 352 | P2  | 아마존 / 설정             | 상품 코드 50개 초과 검색              | ⚠️  | collect/search-product-by-code          |
| 353 | P2  | 아마존 / 설정             | 유효하지 않은 상품 코드 검색             | ⚠️  | collect/search-product-by-code          |
| 354 | P2  | 아마존 / 설정             | 일괄 수집 버튼 선택                  | ⚠️  | collect/bulk-apply-base-setting         |
| 356 | P2  | 아마존 / 설정             | 엑셀 수집 선택                     | ⚠️  | collect/ai-recommend-category           |
| 357 | P2  | 아마존 / 설정             | 상품 수동 추가 버튼 선택               | ⚠️  | collect/ai-recommend-category           |
| 358 | P2  | 아마존 / 설정             | 기능 버튼 선택                     | ⚠️  | collect/ai-recommend-category           |
| 360 | P2  | 벌크 / 카테고리&태그         | 카테고리&태그 변경 모달 확인             | ⚠️  | collect/ai-recommend-category           |
| 361 | P2  | 벌크 / 카테고리&태그         | 카테고리&태그 변경 모달 동작 확인          | ⚠️  | collect/ai-recommend-category           |
| 362 | P2  | 벌크 / 카테고리&태그         | _x0008_템플릿으로 추가하기            | ⚠️  | collect/ai-recommend-category           |
| 363 | P2  | 벌크 / 담당자             | 담당자 변경 버튼                    | ⚠️  | collect/bulk-apply-base-setting         |
| 364 | P2  | 벌크 / 담당자             | 담당자 변경 버튼                    | ⚠️  | collect/bulk-apply-base-setting         |
| 365 | P2  | 벌크 / 삭제              | 상품 삭제                        | ⚠️  | collect/bulk-apply-base-setting         |
| 367 | P2  | 벌크 / 상품명             | 상품명 변경                       | ⚠️  | collect/ai-recommend-name               |
| 368 | P2  | 벌크 / 상품명             | 상품명 변경 모달                    | ⚠️  | collect/ai-recommend-name               |
| 369 | P2  | 벌크 / 상품명             | 수정 버튼 선택                     | ⚠️  | collect/ai-recommend-name               |
| 370 | P2  | 벌크 / 상품명             | 보조 키워드 수 부족                  | ⚠️  | collect/ai-recommend-name               |
| 371 | P2  | 벌크 / 상품명             | 맨 앞에 추가                      | ⚠️  | collect/ai-recommend-name               |
| 372 | P2  | 벌크 / 상품명             | 키워드 입력 후 적용                  | ⚠️  | collect/ai-recommend-name               |
| 373 | P2  | 벌크 / 상품명             | 맨 뒤에 추가                      | ⚠️  | collect/ai-recommend-name               |
| 374 | P2  | 벌크 / 상품명             | 키워드 입력 후 적용                  | ⚠️  | collect/ai-recommend-name               |
| 375 | P2  | 벌크 / 상품명             | 바꾸기                          | ⚠️  | collect/ai-recommend-name               |
| 376 | P2  | 벌크 / 상품명             | 키워드 입력 후 적용                  | ⚠️  | collect/ai-recommend-name               |
| 377 | P2  | 벌크 / 상품명             | 키워드 찾지 못함                    | ⚠️  | collect/ai-recommend-name               |
| 378 | P2  | 벌크 / 상품명             | 삭제                           | ⚠️  | collect/ai-recommend-name               |
| 379 | P2  | 벌크 / 상품명             | 키워드 입력 후 적용                  | ⚠️  | collect/ai-recommend-name               |
| 381 | P2  | 카드뷰 / 기본 설정값 적용      | 카드뷰                          | ⚠️  | collect/bulk-apply-base-setting         |
| 382 | P2  | 카드뷰 / 기본 설정값 적용      | 카드뷰 동작                       | ⚠️  | collect/bulk-apply-base-setting         |
| 384 | P2  | 목록뷰 / 기본 설정값 적용      | 목록뷰                          | ⚠️  | collect/bulk-apply-base-setting         |
| 385 | P2  | 목록뷰 / 기본 설정값 적용      | 페이지 네이션                      | ⚠️  | collect/bulk-apply-base-setting         |
| 386 | P2  | 목록뷰 / 기본 설정값 적용      | 상품노출 개수                      | ⚠️  | collect/bulk-apply-base-setting         |
| 387 | P2  | 상품 상세페이지 / 기본 설정값 적용 | 상품 선택                        | ⚠️  | collect/bulk-apply-base-setting         |
| 388 | P2  | 상품 상세페이지 / GNB       | 상품 페이지 확인                    | ⚠️  | collect/ai-recommend-category           |
| 389 | P2  | 상품 상세페이지 / GNB       | < 버튼 선택                      | ⚠️  | collect/ai-recommend-category           |
| 390 | P2  | 상품 상세페이지 / GNB       | 프로필 아이콘 선택                   | ⚠️  | collect/ai-recommend-category           |
| 391 | P2  | 상품 상세페이지 / GNB       | 업로드 마켓 선택                    | ⚠️  | collect/ai-recommend-category           |
| 392 | P2  | 상품 상세페이지 / GNB       | 상품 삭제 버튼 선택                  | ⚠️  | collect/ai-recommend-category           |
| 393 | P2  | 상품 상세페이지 / GNB       | 원본 상품 버튼 선택                  | ⚠️  | collect/talkstore-product-name-visible  |
| 394 | P2  | 상품 상세페이지 / GNB       | 메모 버튼 선택                     | ⚠️  | collect/ai-recommend-category           |
| 395 | P2  | 상품 상세페이지 / GNB       | AI 일괄번역 버튼 선택                | ⚠️  | collect/ai-recommend-category           |
| 396 | P2  | 상품 상세페이지 / GNB       | 사용 가이드 선택                    | ⚠️  | error-check/check-and-fix               |
| 397 | P2  | 상품 상세페이지 / GNB       | 체크박스 선택                      | ⚠️  | collect/ai-recommend-category           |
| 398 | P2  | 상품 상세페이지 / GNB       | 옵션탭에서 체크된 옵션만 선택             | ⚠️  | collect/ai-recommend-category           |
| 399 | P2  | 상품 상세페이지 / GNB       | 이미지 호버                       | ⚠️  | collect/ai-recommend-category           |
| 400 | P2  | 상품 상세페이지 / GNB       | 이미지 선택                       | ⚠️  | collect/ai-recommend-category           |
| 401 | P2  | 상품 상세페이지 / GNB       | 선택된 이미지 번역                   | ⚠️  | collect/ai-recommend-category           |
| 403 | P2  | 상품 상세페이지 / GNB       | 업로드 버튼 선택                    | ⚠️  | collect/ai-recommend-category           |
| 404 | P2  | 상품 상세페이지 / GNB       | 업로드 버튼 선택                    | ⚠️  | collect/ai-recommend-category           |
| 405 | P2  | 상품 상세페이지 / GNB       | ... 메뉴 선택                    | ⚠️  | collect/bulk-apply-base-setting         |
| 406 | P2  | 상품 상세페이지 / GNB       | 리소스 다운로드                     | ⚠️  | collect/ai-recommend-category           |
| 407 | P2  | 상품 상세페이지 / GNB       | 상품 링크 수정                     | ⚠️  | error-check/check-and-fix               |
| 408 | P2  | 상품 상세페이지 / GNB       | 상품 링크 수정 모달                  | ⚠️  | error-check/check-and-fix               |
| 409 | P2  | 상품 상세페이지 / GNB       | 링크 에러                        | ⚠️  | collect/ai-recommend-category           |
| 410 | P2  | 상품 상세페이지 / GNB       | 상품 복제                        | ⚠️  | collect/ai-recommend-category           |
| 412 | P2  | 상품 상세페이지 / 기본정보      | 기본정보 탭                       | ⚠️  | collect/ai-recommend-category           |
| 413 | P2  | 상품 상세페이지 / 기본정보      | AI 상품명 다듬기 버튼                | ⚠️  | collect/ai-recommend-name               |
| 414 | P2  | 상품 상세페이지 / 기본정보      | 원본 상품명으로 초기화 버튼              | ⚠️  | collect/talkstore-product-name-visible  |
| 416 | P2  | 상품 상세페이지 / 기본정보      | 키워드 검색                       | ⚠️  | collect/ai-recommend-category           |
| 417 | P2  | 상품 상세페이지 / 기본정보      | 키워드 추가                       | ⚠️  | collect/ai-recommend-category           |
| 418 | P2  | 상품 상세페이지 / 기본정보      | 상품명 입력                       | ⚠️  | collect/ai-recommend-name               |
| 419 | P2  | 상품 상세페이지 / 기본정보      | 상품명 입력                       | ⚠️  | collect/ai-recommend-name               |
| 420 | P2  | 상품 상세페이지 / 기본정보      | 상품명 입력                       | ⚠️  | collect/ai-recommend-name               |
| 421 | P2  | 상품 상세페이지 / 기본정보      | 카테고리/태그 변경 버튼 선택             | ⚠️  | collect/ai-recommend-category           |
| 422 | P2  | 상품 상세페이지 / 기본정보      | 카테고리 복사                      | ⚠️  | collect/ai-recommend-category           |
| 423 | P2  | 상품 상세페이지 / 기본정보      | 카테고리 붙여넣기                    | ⚠️  | collect/ai-recommend-category           |
| 425 | P2  | 상품 상세페이지 / 기본정보      | 카테고리 드롭박스 선택                 | ⚠️  | collect/ai-recommend-category           |
| 426 | P2  | 상품 상세페이지 / 기본정보      | 카테고리 검색결과 없음                 | ⚠️  | collect/ai-recommend-category           |
| 427 | P2  | 상품 상세페이지 / 기본정보      | 추천 태그 검색 버튼 선택               | ⚠️  | collect/ai-recommend-category           |
| 428 | P2  | 상품 상세페이지 / 기본정보      | 태그 입력                        | ⚠️  | collect/ai-recommend-category           |
| 429 | P2  | 상품 상세페이지 / 기본정보      | 태그 붙여넣기                      | ⚠️  | collect/ai-recommend-category           |
| 430 | P2  | 상품 상세페이지 / 기본정보      | 태그 입력                        | ⚠️  | collect/ai-recommend-category           |
| 431 | P2  | 상품 상세페이지 / 기본정보      | 중복된 태그 입력                    | ⚠️  | collect/ai-recommend-category           |
| 432 | P2  | 상품 상세페이지 / 이미지       | 이미지 탭 선택                     | ⚠️  | collect/options-a-z-normalize           |
| 433 | P2  | 상품 상세페이지 / 이미지       | 이미지 탭 선택                     | ⚠️  | collect/ai-recommend-category           |
| 434 | P2  | 상품 상세페이지 / 이미지       | 이미지 선택                       | ⚠️  | collect/ai-recommend-category           |
| 435 | P2  | 상품 상세페이지 / 이미지       | 동영상 선택                       | ⚠️  | collect/ai-recommend-category           |
| 436 | P2  | 상품 상세페이지 / 이미지       | 이미지 추가 선택                    | ⚠️  | collect/ai-recommend-category           |
| 437 | P2  | 상품 상세페이지 / 이미지       | 동영상 추가 선택                    | ⚠️  | collect/ai-recommend-category           |
| 438 | P2  | 상품 상세페이지 / 이미지       | 이미지 편집 버튼 선택                 | ⚠️  | collect/ai-recommend-category           |
| 439 | P2  | 상품 상세페이지 / 이미지       | AI 번역 버튼 선택                  | ⚠️  | collect/ai-recommend-category           |
| 440 | P2  | 상품 상세페이지 / 옵션        | 옵션탭 선택                       | ⚠️  | collect/edit-option-price               |
| 441 | P2  | 상품 상세페이지 / 옵션        | 옵션 전체 보기                     | ⚠️  | collect/edit-option-price               |
| 443 | P2  | 상품 상세페이지 / 옵션        | 임시 그룹명 사용                    | ⚠️  | collect/edit-option-price               |
| 444 | P2  | 상품 상세페이지 / 옵션        | 쿠팡 옵션그룹 정책 배너 확인             | ⚠️  | collect/edit-option-price               |
| 445 | P2  | 상품 상세페이지 / 옵션        | 쿠팡 옵션그룹 정책 배너 확인             | ⚠️  | collect/edit-option-price               |
| 446 | P2  | 상품 상세페이지 / 옵션        | AI 옵션명 다듬기 버튼 선택             | ⚠️  | collect/edit-option-price               |
| 447 | P2  | 상품 상세페이지 / 옵션        | 빈칸 버튼 선택                     | ⚠️  | collect/edit-option-price               |
| 448 | P2  | 상품 상세페이지 / 옵션        | 특문 버튼 선택                     | ⚠️  | collect/edit-option-price               |
| 449 | P2  | 상품 상세페이지 / 옵션        | 25글자 버튼 선택                   | ⚠️  | collect/edit-option-price               |
| 450 | P2  | 상품 상세페이지 / 옵션        | 순번 추가하기 버튼 선택                | ⚠️  | collect/edit-option-price               |
| 451 | P2  | 상품 상세페이지 / 옵션        | A-Z 버튼 선택                    | ⚠️  | collect/edit-option-price               |
| 452 | P2  | 상품 상세페이지 / 옵션        | 연필 버튼선택                      | ⚠️  | collect/edit-option-price               |
| 453 | P2  | 상품 상세페이지 / 옵션        | 회전 버튼 선택                     | ⚠️  | collect/edit-option-price               |
| 454 | P2  | 상품 상세페이지 / 옵션        | 옵션 개수 제한 확인 (200개 초과 시 비활성화) | ⚠️  | collect/edit-option-price               |
| 455 | P2  | 상품 상세페이지 / 옵션        | _x0008_옵션 이미지 설정 확인          | ⚠️  | collect/edit-option-price               |
| 456 | P2  | 상품 상세페이지 / 옵션        | 옵션 그룹 추가                     | ⚠️  | collect/edit-option-price               |
| 457 | P2  | 상품 상세페이지 / 옵션        | 옵션 그룹 추가 제한 확인               | ⚠️  | collect/edit-option-price               |
| 458 | P2  | 상품 상세페이지 / 옵션        | 옵션 그룹 삭제 기능 확인               | ⚠️  | collect/edit-option-price               |
| 459 | P2  | 상품 상세페이지 / 옵션        | 옵션 그룹명 수정 기능 확인              | ⚠️  | collect/edit-option-price               |
| 460 | P2  | 상품 상세페이지 / 옵션        | 옵션 그룹명 특수문자 입력               | ⚠️  | collect/edit-option-price               |
| 461 | P2  | 상품 상세페이지 / 옵션        | 옵션 그룹명 25자 초과 입력             | ⚠️  | collect/edit-option-price               |
| 462 | P2  | 상품 상세페이지 / 옵션        | 옵션 추가 기능 확인                  | ⚠️  | collect/edit-option-price               |
| 463 | P2  | 상품 상세페이지 / 옵션        | 옵션 삭제 기능 확인                  | ⚠️  | collect/edit-option-price               |
| 464 | P2  | 상품 상세페이지 / 옵션        | 옵션 순서 변경 기능 확인               | ⚠️  | collect/edit-option-price               |
| 465 | P2  | 상품 상세페이지 / 옵션        | 옵션 선택/해제 기능 확인               | ⚠️  | collect/edit-option-price               |
| 466 | P2  | 상품 상세페이지 / 옵션        | 옵션 최대 개수 제한 확인               | ⚠️  | collect/edit-option-price               |
| 469 | P2  | 상품 상세페이지 / 판매가       | 판매가탭 선택                      | ⚠️  | collect/edit-option-price               |
| 475 | P2  | 상품 상세페이지 / 판매가       | 판매가 펼치기                      | ⚠️  | collect/edit-option-price               |
| 476 | P2  | 상품 상세페이지 / 판매가       | 상품 판매가 변경                    | ⚠️  | collect/edit-option-price               |
| 478 | P2  | 상품 상세페이지 / 판매가       | 실시간/고정 토글 선택                 | ⚠️  | collect/edit-option-price               |
| 482 | P2  | 상품 상세페이지 / 판매가       | 배송대행지 비용 입력                  | ⚠️  | collect/edit-option-price               |
| 490 | P2  | 상품 상세페이지 / 판매가       | 예상 판매가 ⋁ 선택                  | ⚠️  | collect/edit-option-price               |
| 491 | P2  | 상품 상세페이지 / 판매가       | 예상 순수익 ⋁ 선택                  | ⚠️  | collect/edit-option-price               |
| 492 | P2  | 상품 상세페이지 / 판매가       | 취소 선택                        | ⚠️  | collect/edit-option-price               |
| 493 | P2  | 상품 상세페이지 / 판매가       | 저장 선택                        | ⚠️  | collect/edit-option-price               |
| 496 | P2  | 상품 상세페이지 / 판매가       | 전체보기 토글 동작                   | ⚠️  | collect/edit-option-price               |
| 497 | P2  | 상품 상세페이지 / 판매가       | 일괄변경 선택                      | ⚠️  | collect/edit-option-price               |
| 498 | P2  | 상품 상세페이지 / 판매가       | 판매가 일괄변경                     | ⚠️  | collect/edit-option-price               |
| 499 | P2  | 상품 상세페이지 / 판매가       | 판매가에 값 더하기/빼기                | ⚠️  | collect/edit-option-price               |
| 500 | P2  | 상품 상세페이지 / 판매가       | 판매가 통일하기                     | ⚠️  | collect/edit-option-price               |
| 507 | P2  | 상품 상세페이지 / 판매가       | 체크박스 선택                      | ⚠️  | collect/edit-option-price               |
| 508 | P2  | 상품 상세페이지 / 판매가       | 옵션가 기준 변경                    | ⚠️  | collect/edit-option-price               |
| 509 | P2  | 상품 상세페이지 / 판매가       | 원가 변경                        | ⚠️  | collect/edit-option-price               |
| 510 | P2  | 상품 상세페이지 / 판매가       | 판매가 변경                       | ⚠️  | collect/edit-option-price               |
| 512 | P2  | 상품 상세페이지 / 판매가       | 연필 선택                        | ⚠️  | collect/edit-option-price               |
| 513 | P2  | 상품 상세페이지 / 상품 속성     | 상품 속성탭 선택                    | ⚠️  | e2e/verify-product-attribute-on-product |
| 514 | P2  | 상품 상세페이지 / 상품 속성     | 상품 정보고시 직접 추가 버튼 선택          | ⚠️  | collect/edit-option-stock               |
| 515 | P2  | 상품 상세페이지 / 상품 속성     | 상품 정보고시 직접 추가 동작             | ⚠️  | collect/edit-option-stock               |
| 516 | P2  | 상품 상세페이지 / 상품 속성     | 템블릿 불러오기                     | ⚠️  | e2e/verify-product-attribute-on-product |
| 517 | P2  | 상품 상세페이지 / 상품 속성     | 스마트스토어 상품 속성 확인              | ⚠️  | e2e/verify-market-weights-on-product    |
| 518 | P2  | 상품 상세페이지 / 상품 속성     | 스마트스토어 상품속성 확인               | ⚠️  | e2e/verify-market-weights-on-product    |
| 519 | P2  | 상품 상세페이지 / 상품 속성     | 속성 구분 타입 케이스                 | ⚠️  | e2e/verify-product-attribute-on-product |
| 520 | P2  | 상품 상세페이지 / 상품 속성     | 마우스 호버 및 버튼 선택 동작 확인         | ⚠️  | e2e/verify-product-attribute-on-product |
| 521 | P2  | 상품 상세페이지 / 업로드 마켓    | 업로드 마켓 확인                    | ⚠️  | collect/toggle-list-view                |
| 522 | P2  | 상품 상세페이지 / 업로드 마켓    | 업로드 마켓 동작                    | ⚠️  | collect/ai-recommend-category           |
| 523 | P2  | 상품 상세페이지 / 업로드 마켓    | GNB 업로드 마켓과 업로드 설정 동기화 확인    | ⚠️  | collect/toggle-list-view                |
| 524 | P2  | 상품 상세페이지 / 업로드 마켓    | 업로드 마켓 확인                    | ⚠️  | collect/toggle-list-view                |
| 525 | P2  | 상품 상세페이지 / 상세페이지     | 상세페이지 탭 선택                   | ⚠️  | collect/ai-recommend-category           |
| 526 | P2  | 상품 상세페이지 / 상세페이지     | 상세페이지 좌측 이미지                 | ⚠️  | collect/ai-recommend-category           |
| 527 | P2  | 상품 상세페이지 / 상세페이지     | 이미지 복사                       | ⚠️  | collect/ai-recommend-category           |
| 528 | P2  | 상품 상세페이지 / 상세페이지     | 에디터 동작                       | ⚠️  | collect/ai-recommend-category           |
| 529 | P2  | 상품 상세페이지 / 상세페이지     | 에디터 GNB 동작                   | ⚠️  | collect/ai-recommend-category           |
| 530 | P2  | 상품 상세페이지 / 상세페이지     | 미리보기                         | ⚠️  | collect/ai-recommend-category           |
| 531 | P2  | 상품 상세페이지 / 상세페이지     | AI번역                         | ⚠️  | collect/ai-recommend-category           |
| 532 | P2  | 상품 상세페이지 / 상세페이지     | 이미지편집                        | ⚠️  | collect/ai-recommend-category           |
| 533 | P2  | 상품 상세페이지 / 상세페이지     | 상하단이미지수정                     | ⚠️  | collect/ai-recommend-category           |
| 534 | P2  | 상품 상세페이지 / 상세페이지     | 상하단이미지수정                     | ⚠️  | collect/ai-recommend-category           |
| 535 | P2  | 상품 상세페이지 / 상세페이지     | 상하단이미지수정                     | ⚠️  | collect/ai-recommend-category           |
| 536 | P2  | 상품 상세페이지 / 상세페이지     | 상하단이미지수정                     | ⚠️  | collect/ai-recommend-category           |
| 537 | P2  | 상품 상세페이지 / 상세페이지     | 상세페이지구조                      | ⚠️  | collect/ai-recommend-category           |
| 538 | P2  | 상품 상세페이지 / 상세페이지     | 소제목보이기                       | ⚠️  | collect/ai-recommend-category           |
| 539 | P2  | 상품 상세페이지 / 상세페이지     | 옵션이미지 표 설정                   | ⚠️  | collect/ai-recommend-category           |
| 540 | P2  | 상품 상세페이지 / 업로드 설정    | 업로드 설정 탭                     | ⚠️  | collect/ai-recommend-category           |
| 541 | P2  | 상품 상세페이지 / 업로드 설정    | 업로드 설정 탭                     | ⚠️  | collect/ai-recommend-category           |
| 542 | P2  | 상품 상세페이지 / 업로드 설정    | 스스 업로드 설정                    | ⚠️  | collect/ai-recommend-category           |
| 543 | P2  | 상품 상세페이지 / 업로드 설정    | 스마트스토어 모음전 정책 적용 확인          | ⚠️  | e2e/verify-market-weights-on-product    |
| 544 | P2  | 상품 상세페이지 / 업로드 설정    | 상품명 및 첫번째 옵션 순서 변경 사용        | ⚠️  | collect/ai-recommend-name               |
| 545 | P2  | 상품 상세페이지 / 업로드 설정    | 썸네일 이미지 변경 토글 동작             | ⚠️  | collect/talkstore-purchase-point-toggle |
| 547 | P2  | 상품 상세페이지 / 업로드 설정    | 텍스트 인풋박스 확인                  | ⚠️  | collect/ai-recommend-category           |
| 548 | P2  | 상품 상세페이지 / 업로드 설정    | 포토-동영상 인풋박스 입력               | ⚠️  | collect/ai-recommend-category           |
| 549 | P2  | 상품 상세페이지 / 업로드 설정    | validation 확인                | ⚠️  | collect/ai-recommend-category           |
| 550 | P2  | 상품 상세페이지 / 업로드 설정    | 한달사용 텍스트 인풋박스 입력             | ⚠️  | collect/ai-recommend-category           |
| 551 | P2  | 상품 상세페이지 / 업로드 설정    | 한달사용 포토-동영상 인풋박스 입력          | ⚠️  | collect/ai-recommend-category           |
| 552 | P2  | 상품 상세페이지 / 업로드 설정    | validation 확인                | ⚠️  | collect/ai-recommend-category           |
| 553 | P2  | 상품 상세페이지 / 업로드 설정    | 알림받기 동의 고객 리뷰 작성 인풋박스 입력     | ⚠️  | collect/talkstore-review-point-toggle   |
| 554 | P2  | 상품 상세페이지 / 업로드 설정    | 쿠팡 업로드 설정                    | ⚠️  | e2e/verify-market-weights-on-product    |
| 555 | P2  | 상품 상세페이지 / 업로드 설정    | 쿠팡 업로드 설정 확인                 | ⚠️  | e2e/verify-market-weights-on-product    |
| 556 | P2  | 상품 상세페이지 / 업로드 설정    | 검색 필터 확인                     | ⚠️  | collect/ai-recommend-category           |
| 557 | P2  | 상품 상세페이지 / 업로드 설정    | ESM                          | ⚠️  | e2e/verify-market-weights-on-product    |
| 558 | P2  | 상품 상세페이지 / 업로드 설정    | 추천옵션 모드 확인                   | ⚠️  | collect/ai-recommend-category           |
| 559 | P2  | 상품 상세페이지 / 업로드 설정    | 자율옵션 모드 확인                   | ⚠️  | collect/ai-recommend-category           |
| 560 | P2  | 상품 상세페이지 / 업로드 설정    | 버튼 선택                        | ⚠️  | collect/ai-recommend-category           |
| 561 | P2  | 상품 상세페이지 / 업로드 설정    | 단일옵션 모드 확인                   | ⚠️  | collect/ai-recommend-category           |
| 562 | P2  | 상품 상세페이지 / 업로드 설정    | A 영역 동작                      | ⚠️  | collect/ai-recommend-category           |
| 563 | P2  | 상품 상세페이지 / 업로드 설정    | B 영역 동작                      | ⚠️  | collect/ai-recommend-category           |
| 564 | P2  | 상품 상세페이지 / 업로드 설정    | A + B 영역 동작                  | ⚠️  | collect/ai-recommend-category           |
| 565 | P2  | 상품 상세페이지 / 업로드 설정    | 버튼 선택                        | ⚠️  | collect/ai-recommend-category           |
| 566 | P2  | 상품 상세페이지 / 업로드 설정    | 업로드 설정 확인                    | ⚠️  | collect/edit-option-price               |
| 567 | P2  | 상품 상세페이지 / 업로드 설정    | 업로드 설정 확인                    | ⚠️  | collect/edit-option-price               |
| 568 | P2  | 상품 상세페이지 / 업로드 설정    | 롯데온                          | ⚠️  | e2e/verify-market-weights-on-product    |
| 570 | P2  | 업로드 / 업로드 설정         | 업로드 버튼 선택                    | ⚠️  | collect/ai-recommend-category           |
| 571 | P2  | 업로드 / 업로드 설정         | 업로드 버튼 선택                    | ⚠️  | collect/ai-recommend-category           |
| 572 | P2  | 업로드 / 업로드 설정         | 업로드 모달                       | ⚠️  | collect/ai-recommend-category           |
| 573 | P2  | 업로드 / 업로드 설정         | 업로드 모달                       | ⚠️  | collect/ai-recommend-category           |
| 574 | P2  | 업로드 / 업로드 설정         | 업로드 상태창                      | ⚠️  | collect/ai-recommend-category           |
| 575 | P2  | 업로드 / 업로드 설정         | 업로드 상태창                      | ⚠️  | collect/ai-recommend-category           |
| 576 | P2  | 업로드 / 업로드 설정         | 업로드 상태창 동작 확인                | ⚠️  | collect/ai-recommend-category           |
| 866 | P2  | 이미지탭 / 이미지 복사        | 일괄 붙여넣기 버튼 선택                | ⚠️  | collect/bulk-apply-base-setting         |


### 일반 / 상품수집  (182 미작성 / 295 TCs)


| TC#  | P   | Sub / Func       | Title               | 상태  | 유사 ATC                                 |
| ---- | --- | ---------------- | ------------------- | --- | -------------------------------------- |
| 930  | P0  | 엑셀 수집 / 엑셀 수집    | 엑셀 수집               | ❌   | —                                      |
| 932  | P0  | 엑셀 수집 / URL 수집   | URL 수집              | ⚠️  | collect/ai-recommend-name              |
| 1156 | P0  | 엑셀수집 / 수정 업로드    | 엑셀 수집에서 수집방식 선택     | ⚠️  | collect/edit-name-only                 |
| 1157 | P0  | 엑셀수집 / 수정 업로드    | 중국몰 수집              | ⚠️  | collect/edit-name-only                 |
| 1158 | P0  | 엑셀수집 / 수정 업로드    | HTMNL 수집            | ⚠️  | collect/edit-name-only                 |
| 1159 | P0  | URL 수집 / 수정 업로드  | URL 수집에서 수집방식 선택    | ⚠️  | collect/ai-recommend-name              |
| 1160 | P0  | URL 수집 / 수정 업로드  | 중국몰 수집              | ⚠️  | collect/ai-recommend-name              |
| 1161 | P0  | URL 수집 / 수정 업로드  | HTMNL 수집            | ⚠️  | collect/ai-recommend-name              |
| 61   | P2  | 홈화면시작 / ⑥        | 상품수집                | ❌   | —                                      |
| 62   | P2  | 홈화면시작 / ⑥        | 상품수집 페이지 동작         | ❌   | —                                      |
| 63   | P2  | 엑셀 수집 / ⑥        | 엑셀수집 기능 확인          | ❌   | —                                      |
| 64   | P2  | 엑셀 수집 / ⑥        | 모달 기능 확인            | ❌   | —                                      |
| 65   | P2  | 엑셀 수집 / ⑥        | 엑셀 파일 작성            | ❌   | —                                      |
| 66   | P2  | 엑셀 수집 / ⑥        | 엑셀 정상 수집            | ❌   | —                                      |
| 67   | P2  | 엑셀 수집 / ⑥        | 엑셀 수집 실패            | ❌   | —                                      |
| 68   | P2  | 엑셀 수집 / ⑥        | 엑셀 수집 실패            | ❌   | —                                      |
| 69   | P2  | 엑셀 수집 / ⑥        | 엑셀 수집 실패            | ❌   | —                                      |
| 70   | P2  | 엑셀 수집 / ⑥        | 엑셀 재수집              | ❌   | —                                      |
| 71   | P2  | url 수집 / ⑥       | URL 수집 기능 확인        | ⚠️  | collect/ai-recommend-name              |
| 72   | P2  | url 수집 / ⑥       | URL수집 성공            | ⚠️  | collect/ai-recommend-name              |
| 73   | P2  | url 수집 / ⑥       | URL수집 실패            | ⚠️  | collect/ai-recommend-name              |
| 74   | P2  | url 수집 / ⑥       | URL 수집 실패           | ⚠️  | collect/ai-recommend-name              |
| 75   | P2  | url 수집 / ⑥       | 중국몰 수집 방식 선택        | ⚠️  | collect/ai-recommend-name              |
| 77   | P2  | url 수집 / ⑥       | 중국 소싱몰 서버 수집        | ⚠️  | collect/ai-recommend-name              |
| 78   | P2  | 스스 상품 가져오기 / ⑥   | 오픈마켓 상품 가져오기 기능     | ❌   | —                                      |
| 79   | P2  | 스스 상품 가져오기 / ⑥   | 모달 동작 확인            | ❌   | —                                      |
| 80   | P2  | 스스 상품 가져오기 / ⑥   | 스토어 정보 업데이트         | ⚠️  | collect/ai-recommend-category          |
| 81   | P2  | 스스 상품 가져오기 / ⑥   | 가져올 상품 선택           | ❌   | —                                      |
| 82   | P2  | 스스 상품 가져오기 / ⑥   | 모달 동작 확인            | ❌   | —                                      |
| 83   | P2  | 스스 상품 가져오기 / ⑥   | 윈들리 상품 코드 선택        | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 84   | P2  | 스스 상품 가져오기 / ⑥   | 가져올 곳 선택            | ❌   | —                                      |
| 85   | P2  | 스스 상품 가져오기 / ⑥   | 모달 동작 확인            | ❌   | —                                      |
| 86   | P2  | 스스 상품 가져오기 / ⑥   | 등록상품 가져오기           | ❌   | —                                      |
| 87   | P2  | 스스 상품 가져오기 / ⑥   | 수집상품 가져오기           | ⚠️  | collect/ai-recommend-category          |
| 88   | P2  | 수동추가 / ⑥         | 상품 수동 추가            | ❌   | —                                      |
| 89   | P2  | 수동추가 / ⑥         | 상품 추가               | ❌   | —                                      |
| 90   | P2  | 수동추가 / ⑥         | 에러 확인               | ❌   | —                                      |
| 91   | P2  | AI 전세계 상품 수집 / ⑥ | AI 전세계 상품수집         | ❌   | —                                      |
| 92   | P2  | AI 전세계 상품 수집 / ⑥ | 상품수집 개수 확인          | ❌   | —                                      |
| 93   | P2  | AI 전세계 상품 수집 / ⑥ | 상품수집 개수 확인          | ❌   | —                                      |
| 94   | P2  | AI 전세계 상품 수집 / ⑥ | 상품수집 개수 확인          | ❌   | —                                      |
| 95   | P2  | AI 전세계 상품 수집 / ⑥ | 상품수집 개수 확인          | ❌   | —                                      |
| 96   | P2  | AI 전세계 상품 수집 / ⑥ | AI 전세계 상품수집 요청      | ❌   | —                                      |
| 97   | P2  | AI 전세계 상품 수집 / ⑥ | 수집 완료               | ⚠️  | collect/url-collect                    |
| 98   | P2  | AI 전세계 상품 수집 / ⑥ | 최대 상품수집 수 초과        | ❌   | —                                      |
| 99   | P2  | AI 전세계 상품 수집 / ⑥ | 최대 상품수집 수 초과        | ❌   | —                                      |
| 100  | P2  | AI 전세계 상품 수집 / ⑥ | 최대 상품수집 수 초과        | ❌   | —                                      |
| 101  | P2  | AI 전세계 상품 수집 / ⑥ | 최대 상품수집 수 초과        | ❌   | —                                      |
| 102  | P2  | AI 전세계 상품 수집 / ⑥ | 윈들리에서 수집 지원하는 링크 입력 | ❌   | —                                      |
| 103  | P2  | AI 전세계 상품 수집 / ⑥ | 반려된 상품 확인           | ❌   | —                                      |
| 104  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ⚠️  | collect/paginate-collected             |
| 105  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ❌   | —                                      |
| 106  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ❌   | —                                      |
| 107  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ⚠️  | collect/change-page-size               |
| 108  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ⚠️  | collect/change-page-size               |
| 109  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ⚠️  | collect/edit-option-price              |
| 110  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ❌   | —                                      |
| 111  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ⚠️  | collect/edit-option-price              |
| 112  | P2  | AI 전세계 상품 수집 / ⑥ | 반려 사유 확인            | ❌   | —                                      |
| 113  | P2  | 중국몰 상품 검색 / ⑥    | 중국몰 상품 검색           | ❌   | —                                      |
| 114  | P2  | 중국몰 상품 검색 / ⑥    | 검색 동작               | ❌   | —                                      |
| 115  | P2  | 중국몰 상품 검색 / ⑥    | 사용가이드 선택            | ❌   | —                                      |
| 116  | P2  | 중국몰 상품 검색 / ⑥    | 카테고리 선택             | ⚠️  | collect/ai-recommend-category          |
| 117  | P2  | 중국몰 상품 검색 / ⑥    | 키워드 확인              | ❌   | —                                      |
| 118  | P2  | 중국몰 상품 검색 / ⑥    | 키워드 선택              | ❌   | —                                      |
| 119  | P2  | 중국몰 상품 검색 / ⑥    | 일간 키워드 순위 불러오지 못함   | ❌   | —                                      |
| 120  | P2  | 중국몰 상품 검색 / ⑥    | 주간 키워드 순위 불러오지 못함   | ❌   | —                                      |
| 121  | P2  | 중국몰 상품 검색 / ⑥    | 검색 횟수 소진            | ❌   | —                                      |
| 122  | P2  | 중국몰 상품 검색 / ⑥    | 상품 검색 페이지           | ❌   | —                                      |
| 123  | P2  | 중국몰 상품 검색 / ⑥    | 소싱몰 변경              | ❌   | —                                      |
| 124  | P2  | 중국몰 상품 검색 / ⑥    | 정렬 버튼 선택            | ⚠️  | collect/toggle-list-view               |
| 125  | P2  | 중국몰 상품 검색 / ⑥    | 상품수집                | ❌   | —                                      |
| 126  | P2  | 중국몰 상품 검색 / ⑥    | 상품 선택               | ❌   | —                                      |
| 127  | P2  | 중국몰 상품 검색 / ⑥    | 페이지 이동              | ⚠️  | collect/paginate-collected             |
| 128  | P2  | 중국몰 상품 검색 / ⑥    | 수집 실패               | ⚠️  | collect/ai-recommend-category          |
| 129  | P2  | 타오바오 / ⑥         | 타오바오 상품수집           | ⚠️  | collect/import-direct-taobao-popup     |
| 130  | P2  | 타오바오 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-taobao-popup     |
| 131  | P2  | 타오바오 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-taobao-popup     |
| 132  | P2  | 타오바오 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-taobao-popup     |
| 133  | P2  | 타오바오 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-taobao-popup     |
| 134  | P2  | 타오바오 / ⑥         | 타오바오 검색결과 리스트 수집    | ⚠️  | collect/import-direct-taobao-popup     |
| 135  | P2  | 타오바오 / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-taobao-popup     |
| 136  | P2  | 타오바오 / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-taobao-popup     |
| 137  | P2  | 타오바오 / ⑥         | 타오바오 카테고리 리스트 수집    | ⚠️  | collect/import-direct-taobao-popup     |
| 138  | P2  | 타오바오 / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-taobao-popup     |
| 139  | P2  | 타오바오 / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-taobao-popup     |
| 140  | P2  | 타오바오 / ⑥         | 썸네일 수집              | ⚠️  | collect/import-direct-taobao-popup     |
| 141  | P2  | 티몰 / ⑥           | 티몰 상품수집             | ⚠️  | collect/import-direct-tmall-popup      |
| 142  | P2  | 티몰 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-tmall-popup      |
| 144  | P2  | 티몰 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-tmall-popup      |
| 145  | P2  | 티몰 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-tmall-popup      |
| 146  | P2  | 티몰 / ⑥           | 티몰 검색결과 리스트 수집      | ⚠️  | collect/import-direct-tmall-popup      |
| 147  | P2  | 티몰 / ⑥           | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-tmall-popup      |
| 149  | P2  | 티몰 / ⑥           | 티몰 카테고리 리스트 수집      | ⚠️  | collect/import-direct-tmall-popup      |
| 150  | P2  | 티몰 / ⑥           | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-tmall-popup      |
| 151  | P2  | 티몰 / ⑥           | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-tmall-popup      |
| 152  | P2  | 티몰 / ⑥           | 썸네일 수집              | ⚠️  | collect/import-direct-tmall-popup      |
| 153  | P2  | 1688 / ⑥         | 1688 상품수집           | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 154  | P2  | 1688 / ⑥         | 수집 실패               | ⚠️  | collect/ai-recommend-category          |
| 155  | P2  | 1688 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 156  | P2  | 1688 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 157  | P2  | 1688 / ⑥         | 1688 검색결과 리스트 수집    | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 158  | P2  | 1688 / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 159  | P2  | 1688 / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/ai-recommend-category          |
| 160  | P2  | 1688 / ⑥         | 1688 카테고리 리스트 수집    | ⚠️  | collect/ai-recommend-category          |
| 161  | P2  | 1688 / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 162  | P2  | 1688 / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 163  | P2  | 1688 / ⑥         | 썸네일 수집              | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 164  | P2  | 알리 / ⑥           | Ali 상품수집            | ⚠️  | collect/import-direct-aliexpress-popup |
| 165  | P2  | 알리 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-aliexpress-popup |
| 166  | P2  | 알리 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-aliexpress-popup |
| 167  | P2  | 알리 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-aliexpress-popup |
| 168  | P2  | 알리 / ⑥           | Ali 검색결과 리스트 수집     | ⚠️  | collect/import-direct-aliexpress-popup |
| 169  | P2  | 알리 / ⑥           | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-aliexpress-popup |
| 170  | P2  | 알리 / ⑥           | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-aliexpress-popup |
| 171  | P2  | 알리 / ⑥           | Ali 카테고리 리스트 수집     | ⚠️  | collect/import-direct-aliexpress-popup |
| 172  | P2  | 알리 / ⑥           | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-aliexpress-popup |
| 173  | P2  | 알리 / ⑥           | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-aliexpress-popup |
| 174  | P2  | 알리 / ⑥           | 썸네일 수집              | ⚠️  | collect/import-direct-aliexpress-popup |
| 175  | P2  | 라쿠텐 / ⑥          | rakuten 상품수집        | ⚠️  | collect/import-direct-rakuten-popup    |
| 176  | P2  | 라쿠텐 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-rakuten-popup    |
| 177  | P2  | 라쿠텐 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-rakuten-popup    |
| 178  | P2  | 라쿠텐 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-rakuten-popup    |
| 179  | P2  | 라쿠텐 / ⑥          | rakuten 검색결과 리스트 수집 | ⚠️  | collect/import-direct-rakuten-popup    |
| 180  | P2  | 라쿠텐 / ⑥          | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-rakuten-popup    |
| 181  | P2  | 라쿠텐 / ⑥          | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-rakuten-popup    |
| 182  | P2  | 라쿠텐 / ⑥          | rakuten 카테고리 리스트 수집 | ⚠️  | collect/import-direct-rakuten-popup    |
| 183  | P2  | 라쿠텐 / ⑥          | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-rakuten-popup    |
| 184  | P2  | 라쿠텐 / ⑥          | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-rakuten-popup    |
| 185  | P2  | 라쿠텐 / ⑥          | 썸네일 수집              | ⚠️  | collect/import-direct-rakuten-popup    |
| 186  | P2  | 테무 / ⑥           | 테무 상품수집             | ⚠️  | collect/import-direct-temu-popup       |
| 187  | P2  | 테무 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-temu-popup       |
| 188  | P2  | 테무 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-temu-popup       |
| 189  | P2  | 테무 / ⑥           | 수집 실패               | ⚠️  | collect/import-direct-temu-popup       |
| 190  | P2  | vvic / ⑥         | vvic 상품수집           | ⚠️  | collect/import-direct-vvic-popup       |
| 191  | P2  | vvic / ⑥         | 수집 실패               | ⚠️  | collect/ai-recommend-category          |
| 192  | P2  | vvic / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-vvic-popup       |
| 193  | P2  | vvic / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-vvic-popup       |
| 194  | P2  | vvic / ⑥         | vvic 검색결과 리스트 수집    | ⚠️  | collect/import-direct-vvic-popup       |
| 195  | P2  | vvic / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-vvic-popup       |
| 196  | P2  | vvic / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/ai-recommend-category          |
| 197  | P2  | vvic / ⑥         | vvic 카테고리 리스트 수집    | ⚠️  | collect/ai-recommend-category          |
| 198  | P2  | vvic / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-vvic-popup       |
| 199  | P2  | vvic / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-vvic-popup       |
| 200  | P2  | vvic / ⑥         | 썸네일 수집              | ⚠️  | collect/import-direct-vvic-popup       |
| 201  | P2  | 도매꾹 / ⑥          | 도매꾹 상품수집            | ⚠️  | collect/import-direct-domeggook-popup  |
| 202  | P2  | 도매꾹 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-domeggook-popup  |
| 203  | P2  | 도매꾹 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-domeggook-popup  |
| 204  | P2  | 도매꾹 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-domeggook-popup  |
| 205  | P2  | 도매꾹 / ⑥          | 도매꾹 검색결과 리스트 수집     | ⚠️  | collect/import-direct-domeggook-popup  |
| 206  | P2  | 도매꾹 / ⑥          | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-domeggook-popup  |
| 207  | P2  | 도매꾹 / ⑥          | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-domeggook-popup  |
| 208  | P2  | 도매꾹 / ⑥          | 도매꾹 카테고리 리스트 수집     | ⚠️  | collect/import-direct-domeggook-popup  |
| 209  | P2  | 도매꾹 / ⑥          | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-domeggook-popup  |
| 210  | P2  | 도매꾹 / ⑥          | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-domeggook-popup  |
| 211  | P2  | 도매꾹 / ⑥          | 썸네일 수집              | ⚠️  | collect/import-direct-domeggook-popup  |
| 212  | P2  | 도매매 / ⑥          | 도매매 상품수집            | ⚠️  | collect/import-direct-domeme-popup     |
| 213  | P2  | 도매매 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-domeme-popup     |
| 214  | P2  | 도매매 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-domeme-popup     |
| 215  | P2  | 도매매 / ⑥          | 수집 실패               | ⚠️  | collect/import-direct-domeme-popup     |
| 216  | P2  | 도매매 / ⑥          | 도매매 검색결과 리스트 수집     | ⚠️  | collect/import-direct-domeme-popup     |
| 217  | P2  | 도매매 / ⑥          | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-domeme-popup     |
| 218  | P2  | 도매매 / ⑥          | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-domeme-popup     |
| 219  | P2  | 도매매 / ⑥          | 도매매 카테고리 리스트 수집     | ⚠️  | collect/import-direct-domeme-popup     |
| 220  | P2  | 도매매 / ⑥          | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-domeme-popup     |
| 221  | P2  | 도매매 / ⑥          | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-domeme-popup     |
| 222  | P2  | 도매매 / ⑥          | 썸네일 수집              | ⚠️  | collect/import-direct-domeme-popup     |
| 223  | P2  | 오너클랜 / ⑥         | 오너클랜 연동             | ⚠️  | collect/import-direct-ownerclan-popup  |
| 224  | P2  | 오너클랜 / ⑥         | 오너클랜 상품수집           | ⚠️  | collect/import-direct-ownerclan-popup  |
| 225  | P2  | 오너클랜 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-ownerclan-popup  |
| 226  | P2  | 오너클랜 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-ownerclan-popup  |
| 227  | P2  | 오너클랜 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-ownerclan-popup  |
| 228  | P2  | 오너클랜 / ⑥         | 수집 실패               | ⚠️  | collect/import-direct-ownerclan-popup  |
| 229  | P2  | 오너클랜 / ⑥         | 오너클랜 검색결과 리스트 수집    | ⚠️  | collect/import-direct-ownerclan-popup  |
| 230  | P2  | 오너클랜 / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-ownerclan-popup  |
| 231  | P2  | 오너클랜 / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-ownerclan-popup  |
| 232  | P2  | 오너클랜 / ⑥         | 오너클랜 카테고리 리스트 수집    | ⚠️  | collect/import-direct-ownerclan-popup  |
| 233  | P2  | 오너클랜 / ⑥         | 리스트에 등록된 상품 있을 때    | ⚠️  | collect/import-direct-ownerclan-popup  |
| 234  | P2  | 오너클랜 / ⑥         | 검색결과 리스트 수집         | ⚠️  | collect/import-direct-ownerclan-popup  |
| 235  | P2  | 오너클랜 / ⑥         | 썸네일 수집              | ⚠️  | collect/import-direct-ownerclan-popup  |
| 346  | P2  | 아마존 / 설정         | 아마존 언어 설정           | ⚠️  | collect/import-direct-amazon-ca-popup  |
| 347  | P2  | 아마존 / 설정         | 아마존 국가 설정           | ⚠️  | collect/import-direct-amazon-ca-popup  |


### 일반 / 등록상품  (98 미작성 / 193 TCs)


| TC#  | P   | Sub / Func      | Title                         | 상태  | 유사 ATC                                  |
| ---- | --- | --------------- | ----------------------------- | --- | --------------------------------------- |
| 876  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 877  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 883  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 884  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 890  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 891  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 897  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 898  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 904  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 905  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 911  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 912  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 918  | P0  | 상품삭제 / esm 2.0  | 상품 페이지 확인                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 919  | P0  | 상품삭제 / esm 2.0  | 판매자 센터에서 확인                   | ⚠️  | upload/registered-delete-modal-only-esm |
| 920  | P0  | 상품삭제 / esm 2.0  | 상품 아이콘 선택                     | ⚠️  | upload/registered-delete-modal-only-esm |
| 965  | P0  | 이미지 / 배경지우기     | 벌크 이미지 배경지우기                  | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 966  | P0  | 이미지 / 배경지우기     | 단건 이미지 배경지우기                  | ⚠️  | upload/single-product                   |
| 1105 | P0  | 등록상품 목록 / 상품명   | 등록상품에서 확인                     | ⚠️  | upload/edit-name-reupload               |
| 1106 | P0  | 등록상품 목록 / 상품명   | 등록상품에서 확인                     | ⚠️  | upload/edit-name-reupload               |
| 1107 | P0  | 등록상품 목록 / 상품명   | 톡스토어 이동                       | ⚠️  | upload/bulk-edit-enter-step3            |
| 1108 | P0  | 등록상품 목록 / 상품명   | 등록상품 기본 정보                    | ⚠️  | upload/bulk-edit-enter-step2            |
| 1109 | P0  | 등록상품 목록 / 상품명   | 등록상품 상세에서 오픈마켓 링크 선택          | ⚠️  | upload/edit-name-reupload               |
| 1110 | P0  | 등록상품 목록 / 수정업로드 | 수정업로드                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 1112 | P0  | 등록상품 목록 / 추가업로드 | 톡스토어 추가 업로드                   | ⚠️  | upload/top-product-market-popups        |
| 1213 | P0  | 상세페이지 / 상하단이미지  | 업로드 후 상세페이지 확인                | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 1220 | P0  | 상세페이지 / 상하단 이미지 | 상품 상세에서 확인                    | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 872  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 879  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 886  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 893  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 899  | P1  | 상품삭제 / esm 2.0  | ESM 2.0 업로드 확인                | ⚠️  | upload/registered-delete-modal-only-esm |
| 900  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 906  | P1  | 상품삭제 / esm 2.0  | ESM 2.0 업로드 확인                | ⚠️  | upload/registered-delete-modal-only-esm |
| 907  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 913  | P1  | 상품삭제 / esm 2.0  | ESM 2.0 업로드 확인                | ⚠️  | upload/registered-delete-modal-only-esm |
| 914  | P1  | 상품삭제 / esm 2.0  | 아이콘 선택                        | ⚠️  | upload/registered-delete-modal-only-esm |
| 577  | P2  | 업로드 / 업로드 설정    | 등록상품 페이지                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 578  | P2  | 업로드 / 업로드 설정    | 상품명 검색                        | ⚠️  | upload/edit-name-reupload               |
| 579  | P2  | 업로드 / 업로드 설정    | 상품 코드 검색                      | ⚠️  | upload/edit-name-reupload               |
| 580  | P2  | 업로드 / 업로드 설정    | 상품 코드 50개 초과 검색               | ⚠️  | upload/edit-name-reupload               |
| 581  | P2  | 업로드 / 업로드 설정    | 유효하지 않은 상품 코드 검색              | ⚠️  | upload/edit-name-reupload               |
| 582  | P2  | 추가 업로드 / 업로드 설정 | 추가업로드                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 583  | P2  | 추가 업로드 / 업로드 설정 | 마켓에 마우스 오버                    | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 584  | P2  | 추가 업로드 / 업로드 설정 | 다음 선택                         | ⚠️  | upload/bulk-edit-customs-tax-entry      |
| 585  | P2  | 추가 업로드 / 업로드 설정 | 업로드 가능한 마켓 선택                 | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 586  | P2  | 추가 업로드 / 업로드 설정 | 상품 기본정보 변경                    | ⚠️  | upload/registered-delete-modal-only-esm |
| 587  | P2  | 추가 업로드 / 업로드 설정 | 상품 기본정보 변경                    | ⚠️  | upload/registered-delete-modal-only-esm |
| 615  | P2  | 상품 삭제 / 업로드 설정  | 상품삭제                          | ⚠️  | upload/delete-top-product               |
| 616  | P2  | 상품 삭제 / 업로드 설정  | 버튼 동작                         | ⚠️  | upload/delete-top-product               |
| 617  | P2  | 상품 삭제 / 업로드 설정  | 삭제하기 선택                       | ⚠️  | upload/delete-top-product               |
| 618  | P2  | 상품 삭제 / 업로드 설정  | 삭제완료                          | ⚠️  | upload/delete-top-product               |
| 620  | P2  | 상품 삭제 / 업로드 설정  | 삭제                            | ⚠️  | upload/delete-top-product               |
| 621  | P2  | 상품 삭제 / 업로드 설정  | 삭제완료                          | ⚠️  | upload/delete-top-product               |
| 622  | P2  | 상품 삭제 / 업로드 설정  | 페이지 이동 동작                     | ⚠️  | upload/bulk-edit-enter-step3            |
| 623  | P2  | 상품 삭제 / 업로드 설정  | 페이지 이동 동작                     | ⚠️  | upload/bulk-edit-enter-step3            |
| 624  | P2  | 상품 삭제 / 업로드 설정  | 페이지 숫자 선택                     | ⚠️  | upload/delete-top-product               |
| 625  | P2  | 상품 삭제 / 업로드 설정  | > 선택                          | ⚠️  | upload/delete-top-product               |
| 626  | P2  | 상품 삭제 / 업로드 설정  | >｜ 선택                         | ⚠️  | upload/delete-top-product               |
| 627  | P2  | 상품 삭제 / 업로드 설정  | < 선택                          | ⚠️  | upload/delete-top-product               |
| 628  | P2  | 상품 삭제 / 업로드 설정  | ｜< 선택                         | ⚠️  | upload/delete-top-product               |
| 629  | P2  | 상품 삭제 / 업로드 설정  | 상품노출개수 선택                     | ⚠️  | upload/delete-top-product               |
| 630  | P2  | 목록 / 업로드 설정     | 상품명 확인                        | ⚠️  | upload/edit-name-reupload               |
| 631  | P2  | 목록 / 업로드 설정     | 판매가 확인                        | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 632  | P2  | 목록 / 업로드 설정     | 상품 링크 선택                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 633  | P2  | 목록 / 업로드 설정     | 오픈마켓 링크 선택                    | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 634  | P2  | 목록 / 업로드 설정     | 유입수 추적상태 확인                   | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 635  | P2  | 목록 / 업로드 설정     | 유입수 확인                        | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 636  | P2  | 목록 / 업로드 설정     | 담당자 확인                        | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 637  | P2  | 목록 / 업로드 설정     | 상품 등록일 확인                     | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 638  | P2  | 목록 / 업로드 설정     | 상품 메모 확인                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 639  | P2  | 상세 / GNB        | 상품 상세 진입                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 640  | P2  | 상세 / 기본정보       | 기본 정보 탭 확인                    | ⚠️  | upload/bulk-edit-enter-step2            |
| 642  | P2  | 상세 / 이미지        | 이미지 탭 확인                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 644  | P2  | 상세 / 옵션         | 옵션 탭 확인                       | ⚠️  | upload/bulk-edit-customs-tax-options    |
| 646  | P2  | 상세 / 옵션         | 호버 툴팁                         | ⚠️  | upload/bulk-edit-customs-tax-options    |
| 647  | P2  | 상세 / 판매가        | 판매가 탭 확인                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 649  | P2  | 상세 / 상품속성       | 상품 속성 탭 확인                    | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 651  | P2  | 상세 / 상세페이지      | 상세페이지 탭 확인                    | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 653  | P2  | 상세 / 업로드 설정     | 업로드 설정 탭 확인                   | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 658  | P2  | 상세 / 업로드 설정     | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next       |
| 661  | P2  | 상세 / 업로드 설정     | 상품 수정                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 662  | P2  | 상세 / 업로드 설정     | 업로드 마켓 선택 모달                  | ⚠️  | upload/edit-name-reupload               |
| 663  | P2  | 상세 / 업로드 설정     | 선택 동작                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 665  | P2  | 상세 / 업로드 설정     | 버튼 선택                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 666  | P2  | 상세 / 업로드 설정     | 업로드 마켓 선택 모달                  | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 667  | P2  | 상세 / 업로드 설정     | 선택 동작                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 669  | P2  | 상세 / 업로드 설정     | 버튼 선택                         | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 670  | P2  | 상세 / 업로드 설정     | 업로드 실패                        | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 671  | P2  | 상세 / 업로드 설정     | 수정 뒤로가기                       | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 672  | P2  | 상세 / 업로드 설정     | 추가업로드 카테고리수정                  | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 673  | P2  | 상세 / 업로드 설정     | 경고단어                          | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 674  | P2  | 상세 / 업로드 설정     | 경고단어 업로드                      | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 675  | P2  | 상세 / 업로드 설정     | 서버방식                          | ⚠️  | upload/bulk-edit-customs-tax-entry      |
| 676  | P2  | 상세 / 업로드 설정     | 업로드                           | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 678  | P2  | 상세 / 업로드 설정     | 업로드                           | ⚠️  | upload/bulk-edit-all-checkbox-visible   |
| 987  | P2  | 삭제모달 / 수집상품     | 등록상품 삭제 모달 노출                 | ⚠️  | upload/delete-top-product               |
| 988  | P2  | 삭제모달 / 수집상품     | 삭제 모달 확인                      | ⚠️  | upload/delete-top-product               |
| 989  | P2  | 삭제모달 / 수집상품     | 상품 삭제                         | ⚠️  | upload/delete-top-product               |


### 일반 / 배송대행지  (6 미작성 / 178 TCs)


| TC#  | P   | Sub / Func     | Title       | 상태  | 유사 ATC                                |
| ---- | --- | -------------- | ----------- | --- | ------------------------------------- |
| 1355 | P2  | 연결 / 카카오톡 주문알림 | 배송대행지 화면 확인 | ⚠️  | e2e/delivery-agency-enter-application |
| 1357 | P2  | 연결 / 카카오톡 주문알림 | 배송대행지 화면 확인 | ⚠️  | e2e/delivery-agency-enter-application |
| 1360 | P2  | 화면 / 카카오톡 주문알림 | 버튼 동작       | ⚠️  | settings/da-application-manual-add    |
| 1361 | P2  | 화면 / 카카오톡 주문알림 | ! 호버        | ⚠️  | settings/da-application-manual-add    |
| 1363 | P2  | 화면 / 카카오톡 주문알림 | 버튼 동작       | ⚠️  | settings/da-application-manual-add    |
| 1365 | P2  | 화면 / 카카오톡 주문알림 | 버튼 동작       | ⚠️  | settings/da-application-manual-add    |


### 일반 / 업로드  (102 미작성 / 102 TCs)


| TC#  | P   | Sub / Func        | Title                         | 상태  | 유사 ATC                                       |
| ---- | --- | ----------------- | ----------------------------- | --- | -------------------------------------------- |
| 1221 | P0  | 업로드 스토어 / 상하단 이미지 | 업로드 후 상세페이지 확인                | ❌   | —                                            |
| 1222 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 접속                       | ❌   | —                                            |
| 1223 | P0  | 업로드 스토어 / 상하단 이미지 | 팝업 확인                         | ❌   | —                                            |
| 1224 | P0  | 업로드 스토어 / 상하단 이미지 | 괜찮아요 선택                       | ❌   | —                                            |
| 1225 | P0  | 업로드 스토어 / 상하단 이미지 | 좋야요! 선택                       | ❌   | —                                            |
| 1226 | P0  | 업로드 스토어 / 상하단 이미지 | 설문 확면 확인                      | ❌   | —                                            |
| 1228 | P0  | 업로드 스토어 / 상하단 이미지 | 다음 선택                         | ⚠️  | upload/bulk-edit-customs-tax-entry           |
| 1229 | P0  | 업로드 스토어 / 상하단 이미지 | 1번 설문 진행                      | ⚠️  | upload/edit-name-reupload                    |
| 1230 | P0  | 업로드 스토어 / 상하단 이미지 | 2번 설문 화면 확인                   | ❌   | —                                            |
| 1231 | P0  | 업로드 스토어 / 상하단 이미지 | 2번 설문 진행                      | ⚠️  | upload/edit-name-reupload                    |
| 1232 | P0  | 업로드 스토어 / 상하단 이미지 | 3번 설문 화면 확인                   | ❌   | —                                            |
| 1233 | P0  | 업로드 스토어 / 상하단 이미지 | 3번 설문 진행                      | ⚠️  | upload/edit-name-reupload                    |
| 1234 | P0  | 업로드 스토어 / 상하단 이미지 | 4번 설문 화면 확인                   | ❌   | —                                            |
| 1235 | P0  | 업로드 스토어 / 상하단 이미지 | 4번 설문 진행                      | ⚠️  | upload/edit-name-reupload                    |
| 1236 | P0  | 업로드 스토어 / 상하단 이미지 | 5번 설문 화면 확인                   | ❌   | —                                            |
| 1237 | P0  | 업로드 스토어 / 상하단 이미지 | 5번 설문 진행                      | ⚠️  | upload/edit-name-reupload                    |
| 1238 | P0  | 업로드 스토어 / 상하단 이미지 | 6번 설문 화면 확인                   | ❌   | —                                            |
| 1239 | P0  | 업로드 스토어 / 상하단 이미지 | 6번 설문 진행                      | ⚠️  | upload/edit-name-reupload                    |
| 1240 | P0  | 업로드 스토어 / 상하단 이미지 | 설정 화면                         | ❌   | —                                            |
| 1259 | P0  | 업로드 스토어 / 상하단 이미지 | 버튼 선택                         | ❌   | —                                            |
| 1260 | P0  | 업로드 스토어 / 상하단 이미지 | 버튼 선택                         | ❌   | —                                            |
| 1261 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1262 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1263 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1264 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1265 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1266 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1267 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1268 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1269 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1270 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1271 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1272 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1273 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1274 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1275 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1276 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1277 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1278 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 적용 확인                    | ❌   | —                                            |
| 1279 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 재진입                      | ❌   | —                                            |
| 1280 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 베너 버튼 선택                 | ❌   | —                                            |
| 1281 | P0  | 업로드 스토어 / 상하단 이미지 | 기본설정 추천받은 유저가 한번더 추천 받을 때     | ❌   | —                                            |
| 1125 | P1  | 워터마크 / 수정 업로드     | 옵션이미지를 대표이미지로 사용 설정 후 업로드     | ⚠️  | upload/bulk-edit-all-checkbox-visible        |
| 1126 | P1  | 워터마크 / 수정 업로드     | 업로드 실패 케이스                    | ⚠️  | upload/bulk-edit-all-checkbox-visible        |
| 1227 | P1  | 업로드 스토어 / 상하단 이미지 | 이전 선택                         | ❌   | —                                            |
| 1241 | P1  | 업로드 스토어 / 상하단 이미지 | 설문 완료 후 답변에 대한 결과 문구 확인       | ⚠️  | upload/single-product                        |
| 1242 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1243 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1244 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1245 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1246 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1247 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1248 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1249 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1250 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1251 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1252 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1253 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1254 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1255 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1256 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1257 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1258 | P1  | 업로드 스토어 / 상하단 이미지 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | upload/bulk-edit-none-blocks-next            |
| 1282 | P2  | 해구대 / 카카오톡 주문알림   | 주문 관리에서 카카오톡 베너 확인            | ❌   | —                                            |
| 1283 | P2  | 해구대 / 카카오톡 주문알림   | 베너에서 카카오톡 주문알림 선택             | ❌   | —                                            |
| 1284 | P2  | 해구대 / 카카오톡 주문알림   | 카카오톡 연결 설정 화면 확인              | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1285 | P2  | 해구대 / 카카오톡 주문알림   | 사용가이드 확인                      | ❌   | —                                            |
| 1286 | P2  | 해구대 / 카카오톡 주문알림   | 카카오 계정 미연결 시 토글 동작            | ⚠️  | upload/bulk-edit-inactive-market-shown       |
| 1287 | P2  | 해구대 / 카카오톡 주문알림   | 카카오 계정 연결하기                   | ❌   | —                                            |
| 1288 | P2  | 해구대 / 카카오톡 주문알림   | 연결 후 카카오 연결 설정 확인             | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1289 | P2  | 해구대 / 카카오톡 주문알림   | 카카오 계정 연결 후 주문 알림 받기 토글 동작    | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1290 | P2  | 해구대 / 카카오톡 주문알림   | 채널 친구 추가                      | ❌   | —                                            |
| 1291 | P2  | 해구대 / 카카오톡 주문알림   | 연결 해제                         | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1292 | P2  | 해구대 / 카카오톡 주문알림   | 취소                            | ⚠️  | upload/bulk-edit-cancel-closes               |
| 1293 | P2  | 해구대 / 카카오톡 주문알림   | 연결 해제                         | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1294 | P2  | 해구대 / 카카오톡 주문알림   | 카카오 계정 연결하기                   | ❌   | —                                            |
| 1295 | P2  | 해구대 / 카카오톡 주문알림   | 주문알림 받기 활성화                   | ⚠️  | upload/top-product-market-popups             |
| 1296 | P2  | 해구대 / 카카오톡 주문알림   | 연결 해제                         | ⚠️  | upload/bulk-edit-market-controls-forms       |
| 1297 | P2  | 해구대 / 카카오톡 주문알림   | 플랜 변경 후 주문알림 사용 불가능           | ⚠️  | upload/delete-top-product                    |
| 1298 | P2  | 해구대 / 카카오톡 주문알림   | 주문 알림 확인                      | ⚠️  | upload/registered-delete-modal-only-lotte-on |
| 1299 | P2  | 해구대 / 카카오톡 주문알림   | 자세히 보기 확인                     | ❌   | —                                            |
| 1300 | P2  | 해구대 / 카카오톡 주문알림   | 주문 알림 확인                      | ❌   | —                                            |
| 1301 | P2  | 해구대 / 카카오톡 주문알림   | 여러 계정 연결후 주문 알림               | ⚠️  | upload/bulk-edit-market-controls-forms       |
| 1302 | P2  | 해구대 / 카카오톡 주문알림   | 플랜 변경 후 주문알림                  | ❌   | —                                            |
| 1303 | P2  | 위탁 / 카카오톡 주문알림    | 주문관리에서 카카오 알림 받기 확인           | ❌   | —                                            |
| 1304 | P2  | 위탁 / 카카오톡 주문알림    | 알림 받기 선택                      | ❌   | —                                            |
| 1305 | P2  | 위탁 / 카카오톡 주문알림    | 카카오톡 주문 알림 화면 확인              | ❌   | —                                            |
| 1306 | P2  | 위탁 / 카카오톡 주문알림    | 카카오로 시작하기                     | ❌   | —                                            |
| 1307 | P2  | 위탁 / 카카오톡 주문알림    | 연결 성공                         | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1308 | P2  | 위탁 / 카카오톡 주문알림    | 연결 실패                         | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1309 | P2  | 위탁 / 카카오톡 주문알림    | 연결 성공 후 화면 확인                 | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1310 | P2  | 위탁 / 카카오톡 주문알림    | 카카오 채널 친구 추가                  | ❌   | —                                            |
| 1311 | P2  | 위탁 / 카카오톡 주문알림    | 카카오로 시작하기 확인                  | ❌   | —                                            |
| 1312 | P2  | 위탁 / 카카오톡 주문알림    | 카카오톡 주문 알림 화면                 | ❌   | —                                            |
| 1313 | P2  | 위탁 / 카카오톡 주문알림    | 플랜 변경                         | ❌   | —                                            |
| 1314 | P2  | 위탁 / 카카오톡 주문알림    | 카카오로 시작하기 선택                  | ❌   | —                                            |
| 1315 | P2  | 위탁 / 카카오톡 주문알림    | 계정 해제                         | ❌   | —                                            |
| 1316 | P2  | 위탁 / 카카오톡 주문알림    | 취소                            | ⚠️  | upload/bulk-edit-cancel-closes               |
| 1317 | P2  | 위탁 / 카카오톡 주문알림    | 연결 해제                         | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1318 | P2  | 위탁 / 카카오톡 주문알림    | 연결 해제 실패                      | ⚠️  | upload/bulk-edit-step2-disabled-blocks       |
| 1319 | P2  | 위탁 / 카카오톡 주문알림    | 주문 발생                         | ❌   | —                                            |
| 1320 | P2  | 위탁 / 카카오톡 주문알림    | 주문 알림 끊은 계정에서 주문 발생           | ❌   | —                                            |


### 일반 / 연결설정  (51 미작성 / 57 TCs)


| TC#  | P   | Sub / Func        | Title                         | 상태  | 유사 ATC                                        |
| ---- | --- | ----------------- | ----------------------------- | --- | --------------------------------------------- |
| 993  | P0  | 오픈마켓 / 설정         | 스토어 연결하기 선택                   | ❌   | —                                             |
| 994  | P0  | 오픈마켓 / 설정         | 스토어 바로가기 선택                   | ❌   | —                                             |
| 995  | P0  | 오픈마켓 / 설정         | Open API 인증키 입력               | ⚠️  | collect/edit-name-only                        |
| 996  | P0  | 오픈마켓 / 설정         | 스토어 연결하기 선택                   | ❌   | —                                             |
| 997  | P0  | 오픈마켓 / 설정         | 취소 선택                         | ⚠️  | collect/open-url-collect-modal-cancel         |
| 998  | P0  | 오픈마켓 / 설정         | 확인했어요 선택                      | ❌   | —                                             |
| 999  | P0  | 오픈마켓 / 설정         | 다음에 하기 선택                     | ❌   | —                                             |
| 1000 | P0  | 오픈마켓 / 설정         | 설정하러 가기 선택                    | ❌   | —                                             |
| 1001 | P0  | 오픈마켓 / 설정         | 스토어 URL 입력                    | ⚠️  | collect/talkstore-category-dropdown-open      |
| 1002 | P0  | 오픈마켓 / 설정         | 스토어 바로가기 선택                   | ❌   | —                                             |
| 1003 | P0  | 오픈마켓 / 설정         | 설정 초기화 선택                     | ❌   | —                                             |
| 1004 | P0  | 오픈마켓 / 설정         | 취소 선택                         | ⚠️  | collect/open-url-collect-modal-cancel         |
| 1005 | P0  | 오픈마켓 / 설정         | 설정 초기화 선택                     | ❌   | —                                             |
| 1006 | P0  | 오픈마켓 / 설정         | 초기화 이유 입력 후 초기화               | ❌   | —                                             |
| 1007 | P0  | 오픈마켓 / 설정         | 스토어 연결하기 선택                   | ⚠️  | collect/product-error-check                   |
| 1008 | P0  | 오픈마켓 / 설정         | 스토어 바로가기 선택                   | ❌   | —                                             |
| 1010 | P0  | 오픈마켓 / 설정         | 확인했어요 선택                      | ❌   | —                                             |
| 1011 | P0  | 오픈마켓 / 설정         | 스토어 URL 입력                    | ⚠️  | collect/ai-recommend-name                     |
| 1012 | P0  | 오픈마켓 / 설정         | 잘못된 스토어 URL 입력 후 이동           | ⚠️  | collect/ai-recommend-name                     |
| 1321 | P0  | 배송대행지 / 카카오톡 주문알림 | 배송대행지 연결 페이지 확인               | ⚠️  | settings/da-application-manual-add            |
| 1323 | P0  | 배송대행지 / 카카오톡 주문알림 | 퀵스타 연결 모달                     | ⚠️  | settings/da-application-manual-add            |
| 1324 | P0  | 배송대행지 / 카카오톡 주문알림 | 퀵스타 연결                        | ⚠️  | settings/da-application-manual-add            |
| 1325 | P0  | 배송대행지 / 카카오톡 주문알림 | 모달 취소 버튼 선택                   | ⚠️  | settings/da-application-manual-add            |
| 1327 | P0  | 배송대행지 / 카카오톡 주문알림 | 회원가입 하기 선택                    | ⚠️  | settings/da-application-manual-add            |
| 1328 | P0  | 배송대행지 / 카카오톡 주문알림 | 회원가입 모달                       | ⚠️  | settings/da-application-manual-add            |
| 1329 | P0  | 배송대행지 / 카카오톡 주문알림 | 회원가입 인풋 채우기                   | ⚠️  | settings/da-application-manual-add            |
| 991  | P1  | 오픈마켓 / 수집상품       | 고객센터 버튼 선택                    | ⚠️  | collect/ai-recommend-category                 |
| 992  | P1  | 오픈마켓 / 수집상품       | 사용가이드 선택                      | ⚠️  | collect/ai-recommend-category                 |
| 1009 | P1  | 오픈마켓 / 설정         | 잘못된 인증키 입력 후 연결               | ⚠️  | settings/talkstore-base-as-phone-format-error |
| 1326 | P1  | 배송대행지 / 카카오톡 주문알림 | 아이디/비밀번호 찾기                   | ⚠️  | settings/da-application-manual-add            |
| 1337 | P1  | 배송대행지 / 카카오톡 주문알림 | 모달에서 취소 선택                    | ⚠️  | settings/da-application-manual-add            |
| 1330 | P2  | 배송대행지 / 카카오톡 주문알림 | 인풋 validation                 | ⚠️  | settings/da-application-manual-add            |
| 1331 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1332 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1333 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1334 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1335 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1336 | P2  | 배송대행지 / 카카오톡 주문알림 | 비밀번호 확인, 비밀번호 눈 모양            | ⚠️  | settings/da-application-manual-add            |
| 1338 | P2  | 배송대행지 / 카카오톡 주문알림 | 퀵스타 연결                        | ⚠️  | settings/da-application-manual-add            |
| 1340 | P2  | 배송대행지 / 카카오톡 주문알림 | 확인하기 버튼 선택                    | ⚠️  | settings/da-application-manual-add            |
| 1341 | P2  | 배송대행지 / 카카오톡 주문알림 | 회원가입 하기 선택                    | ⚠️  | settings/da-application-manual-add            |
| 1342 | P2  | 배송대행지 / 카카오톡 주문알림 | 회원가입 모달                       | ⚠️  | settings/da-application-manual-add            |
| 1343 | P2  | 배송대행지 / 카카오톡 주문알림 | 회원가입 인풋 채우기                   | ⚠️  | settings/da-application-manual-add            |
| 1344 | P2  | 배송대행지 / 카카오톡 주문알림 | 인풋 validation                 | ⚠️  | settings/da-application-manual-add            |
| 1345 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1346 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1347 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1348 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1349 | P2  | 배송대행지 / 카카오톡 주문알림 | [제목 없음] - 2026-01-16 02:55:55 | ⚠️  | settings/da-application-manual-add            |
| 1350 | P2  | 배송대행지 / 카카오톡 주문알림 | 비밀번호 확인, 비밀번호 눈 모양            | ⚠️  | settings/da-application-manual-add            |
| 1353 | P2  | 배송대행지 / 카카오톡 주문알림 | 퀵스타 연결 해제                     | ⚠️  | settings/da-application-manual-add            |


### 스스관부가세 / 등록상품  (5 미작성 / 40 TCs)


| TC#  | P   | Sub / Func        | Title                           | 상태  | 유사 ATC                                    |
| ---- | --- | ----------------- | ------------------------------- | --- | ----------------------------------------- |
| 3566 | P0  | 목록 화면 / 화면 진입     | 등록상품 화면이 정상 진입된다                | ⚠️  | upload/delete-top-product                 |
| 3569 | P0  | 목록 화면 / 상품 선택     | 등록상품을 개별 선택할 수 있다               | ⚠️  | upload/bulk-edit-individual-market-select |
| 3570 | P0  | 목록 화면 / 다중 선택     | 여러 등록상품을 동시에 선택할 수 있다           | ⚠️  | upload/bulk-edit-all-checkbox-visible     |
| 3567 | P1  | 목록 화면 / 상단 기본 UI  | 등록상품 화면의 상단 검색 및 액션 영역이 정상 노출된다 | ⚠️  | upload/edit-top-name-reupload             |
| 3568 | P1  | 목록 화면 / 목록 테이블 UI | 등록상품 목록 테이블이 정상 노출된다            | ⚠️  | upload/bulk-edit-all-checkbox-visible     |


### 일반 / 주문관리  (26 미작성 / 33 TCs)


| TC#  | P   | Sub / Func      | Title                       | 상태  | 유사 ATC                                |
| ---- | --- | --------------- | --------------------------- | --- | ------------------------------------- |
| 1534 | P0  | 배대지 신청서 작성 / 결제 | 퀵스타 신청서 작성                  | ⚠️  | e2e/delivery-agency-enter-application |
| 1535 | P0  | 배대지 신청서 작성 / 결제 | 토스토스 신청서 작성                 | ⚠️  | e2e/delivery-agency-enter-application |
| 1536 | P1  | 배대지 신청서 작성 / 결제 | 퀵스타 신청서 작성                  | ⚠️  | e2e/delivery-agency-enter-application |
| 1537 | P1  | 배대지 신청서 작성 / 결제 | 토스토스 신청서 작성                 | ⚠️  | e2e/delivery-agency-enter-application |
| 1538 | P1  | 배대지 신청서 작성 / 결제 | 상품 1개 트래킹 번호 1개             | ⚠️  | e2e/delivery-agency-enter-application |
| 1539 | P1  | 배대지 신청서 작성 / 결제 | 상품 2개 트래킹 번호 동일             | ⚠️  | e2e/delivery-agency-enter-application |
| 1540 | P1  | 배대지 신청서 작성 / 결제 | 상품 3개 트래킹 번호 3개             | ⚠️  | e2e/delivery-agency-enter-application |
| 1541 | P1  | 배대지 신청서 작성 / 결제 | 상품 1개 트래킹 번호 2개             | ⚠️  | e2e/delivery-agency-enter-application |
| 756  | P2  | 상세 / 업로드 설정     | 주문관리                        | ⚠️  | e2e/order-management-change-status    |
| 757  | P2  | 상세 / 업로드 설정     | 주문관리 리스트 확인                 | ⚠️  | e2e/order-management-change-status    |
| 760  | P2  | 상세 / 업로드 설정     | 검색                          | ⚠️  | e2e/order-management-change-status    |
| 761  | P2  | 상세 / 업로드 설정     | 날짜 필터 선택                    | ⚠️  | e2e/order-management-change-status    |
| 762  | P2  | 상세 / 업로드 설정     | 마켓 드롭박스 선택                  | ⚠️  | e2e/order-management-change-status    |
| 763  | P2  | 상세 / 업로드 설정     | 검색, 필터, 마켓 선택 시 결과가 없을 때 화면 | ⚠️  | e2e/order-management-change-status    |
| 764  | P2  | 상세 / 업로드 설정     | 리스트에서 마우스 호버 액션             | ⚠️  | e2e/order-management-change-status    |
| 766  | P2  | 상세 / 업로드 설정     | 상세 페이지 확인                   | ⚠️  | e2e/order-management-change-status    |
| 768  | P2  | 상세 / 업로드 설정     | 리스트 버튼 동작 확인                | ⚠️  | e2e/order-management-change-status    |
| 769  | P2  | 상세 / 업로드 설정     | 상세 페이지 확인                   | ⚠️  | e2e/order-management-change-status    |
| 771  | P2  | 상세 / 업로드 설정     | 리스트 버튼 동작 확인                | ⚠️  | e2e/order-management-change-status    |
| 772  | P2  | 상세 / 업로드 설정     | 상세 페이지 확인                   | ⚠️  | e2e/order-management-change-status    |
| 773  | P2  | 상세 / 업로드 설정     | 리스트 목록 확인                   | ⚠️  | e2e/order-management-change-status    |
| 774  | P2  | 상세 / 업로드 설정     | 리스트 버튼 동작 확인                | ⚠️  | e2e/order-management-change-status    |
| 775  | P2  | 상세 / 업로드 설정     | 상세 페이지 확인                   | ⚠️  | e2e/order-management-change-status    |
| 776  | P2  | 상세 / 업로드 설정     | 직원 정보 수정에서 주문관리 안내 확인       | ⚠️  | e2e/order-management-change-status    |
| 778  | P2  | 상세 / 업로드 설정     | 리스트에서 마우스 호버, 버튼 선택 액션      | ⚠️  | e2e/order-management-change-status    |
| 779  | P2  | 상세 / 업로드 설정     | 취소된 주문 확인                   | ⚠️  | e2e/order-management-change-status    |


### 스스관부가세 / 수집상품  (19 미작성 / 30 TCs)


| TC#  | P   | Sub / Func                | Title                              | 상태  | 유사 ATC                          |
| ---- | --- | ------------------------- | ---------------------------------- | --- | ------------------------------- |
| 3536 | P0  | 목록 화면 / 화면 진입             | 수집상품 화면이 정상 진입된다                   | ⚠️  | collect/bulk-apply-base-setting |
| 3541 | P0  | 목록 화면 / 상품 선택             | 상품 카드를 개별 선택할 수 있다                 | ⚠️  | collect/bulk-apply-base-setting |
| 3542 | P0  | 목록 화면 / 다중 선택             | 여러 상품을 동시에 선택할 수 있다                | ⚠️  | collect/ai-recommend-category   |
| 3548 | P0  | 기본 설정값 적용 / 모달 제목 및 안내 문구 | 기본 설정값 적용 모달의 제목과 안내 문구가 정상 노출된다   | ⚠️  | collect/bulk-apply-base-setting |
| 3549 | P0  | 기본 설정값 적용 / 모달 경고 문구      | 기본 설정값 적용 모달의 경고 문구가 정상 노출된다       | ⚠️  | collect/bulk-apply-base-setting |
| 3551 | P0  | 기본 설정값 적용 / 모달 버튼         | 취소 및 적용 버튼이 정상 노출된다                | ⚠️  | collect/bulk-apply-base-setting |
| 3563 | P0  | 기본 설정값 적용 / 적용 후 데이터 반영   | 적용된 값이 상품 설정에 실제 반영된다              | ⚠️  | collect/bulk-apply-base-setting |
| 3537 | P1  | 목록 화면 / 상단 검색 영역          | 상단 검색 및 액션 영역이 정상 노출된다             | ⚠️  | collect/bulk-apply-base-setting |
| 3540 | P1  | 목록 화면 / 상품 카드 UI          | 상품 카드의 기본 정보가 정상 노출된다              | ⚠️  | collect/ai-recommend-category   |
| 3546 | P1  | 목록 화면 / 기본 설정값 적용 툴팁      | 기본 설정값 적용 툴팁이 정상 노출된다              | ⚠️  | collect/bulk-apply-base-setting |
| 3550 | P1  | 기본 설정값 적용 / 모달 항목 요약      | 기본 설정값 적용 항목 요약 영역이 정상 노출된다        | ⚠️  | collect/bulk-apply-base-setting |
| 3556 | P1  | 기본 설정값 적용 / 모달 툴팁 아이콘     | 항목별 툴팁 아이콘이 정상 노출된다                | ⚠️  | collect/bulk-apply-base-setting |
| 3557 | P1  | 기본 설정값 적용 / 판매가 툴팁        | 판매가 툴팁 상세 문구가 정상 노출된다              | ⚠️  | collect/bulk-apply-base-setting |
| 3558 | P1  | 기본 설정값 적용 / 배송 툴팁         | 배송 툴팁 상세 문구가 정상 노출된다               | ⚠️  | collect/bulk-apply-base-setting |
| 3559 | P1  | 기본 설정값 적용 / 상세페이지 설정 툴팁   | 상세페이지 설정 툴팁 상세 문구가 정상 노출된다         | ⚠️  | collect/bulk-apply-base-setting |
| 3564 | P1  | 기본 설정값 적용 / 되돌리기 안내 문구    | 되돌릴 수 없음 안내 문구가 사용자에게 명확히 전달된다     | ⚠️  | collect/bulk-apply-base-setting |
| 3539 | P2  | 목록 화면 / 정렬/페이지 수          | 정렬 및 페이지 수 설정 영역이 정상 노출된다          | ⚠️  | collect/toggle-list-view        |
| 3562 | P2  | 기본 설정값 적용 / 모달 최소화 UI     | 기본 설정값 적용 모달이 최소화된 요약 구조로 노출된다     | ⚠️  | collect/bulk-apply-base-setting |
| 3565 | P2  | 기본 설정값 적용 / 다건 적용 성능      | 여러 상품 선택 시에도 기본 설정값 적용 모달이 정상 동작한다 | ⚠️  | collect/bulk-apply-base-setting |


### 스스관부가세 / 기본설정  (15 미작성 / 27 TCs)


| TC#  | P   | Sub / Func                 | Title                       | 상태  | 유사 ATC                                   |
| ---- | --- | -------------------------- | --------------------------- | --- | ---------------------------------------- |
| 3467 | P0  | 스마트스토어 배송 및 A/S / 화면 진입    | 배송 및 A/S 화면이 정상 진입된다        | ⚠️  | settings/talkstore-base-as-message-input |
| 3471 | P0  | 스마트스토어 배송 및 A/S / 출고지 설정   | 출고지 선택 드롭다운이 정상 노출된다        | ⚠️  | settings/talkstore-base-as-message-input |
| 3472 | P0  | 스마트스토어 배송 및 A/S / 출고지 설정   | 출고지 목록을 선택할 수 있다            | ⚠️  | settings/talkstore-base-as-message-input |
| 3473 | P0  | 스마트스토어 배송 및 A/S / 반품지 설정   | 반품지 선택 드롭다운이 정상 노출된다        | ⚠️  | settings/talkstore-base-as-message-input |
| 3474 | P0  | 스마트스토어 배송 및 A/S / 반품지 설정   | 반품지 목록을 선택할 수 있다            | ⚠️  | settings/talkstore-base-as-message-input |
| 3475 | P0  | 스마트스토어 배송 및 A/S / 택배사 설정   | 택배사 선택 드롭다운이 정상 노출된다        | ⚠️  | settings/da-domestic-request-preset      |
| 3476 | P0  | 스마트스토어 배송 및 A/S / 택배사 설정   | 택배사 목록을 선택할 수 있다            | ⚠️  | settings/da-domestic-request-preset      |
| 3491 | P0  | 스마트스토어 배송 및 A/S / 필수값 검증   | 필수 항목 누락 시 저장이 제한된다         | ⚠️  | settings/talkstore-base-as-message-input |
| 3492 | P0  | 스마트스토어 배송 및 A/S / 설정 저장    | 변경한 배송 및 A/S 설정이 저장된다       | ⚠️  | settings/talkstore-base-as-message-input |
| 3493 | P0  | 스마트스토어 배송 및 A/S / 설정 유지    | 저장한 배송 및 A/S 설정이 재진입 후 유지된다 | ⚠️  | settings/talkstore-base-as-message-input |
| 3468 | P1  | 스마트스토어 배송 및 A/S / 화면 기본 UI | 배송 및 A/S 화면의 기본 UI가 정상 노출된다 | ⚠️  | settings/talkstore-base-as-message-input |
| 3490 | P1  | 스마트스토어 배송 및 A/S / A/S 안내내용 | A/S 안내 내용을 입력할 수 있다         | ⚠️  | settings/talkstore-base-as-message-input |
| 3469 | P2  | 스마트스토어 배송 및 A/S / 상단 마켓 탭  | 상단 마켓 탭이 정상 노출된다            | ⚠️  | settings/talkstore-base-as-message-input |
| 3470 | P2  | 스마트스토어 배송 및 A/S / 좌측 서브 메뉴 | 좌측 서브 메뉴가 정상 노출된다           | ⚠️  | settings/talkstore-base-as-message-input |
| 3481 | P2  | 스마트스토어 배송 및 A/S / 배송 속성    | 배송 속성 섹션이 정상 노출된다           | ⚠️  | settings/talkstore-base-as-message-input |


### 일반 / 연결 설정  (20 미작성 / 22 TCs)


| TC#  | P   | Sub / Func                          | Title                                                                            | 상태  | 유사 ATC                                 |
| ---- | --- | ----------------------------------- | -------------------------------------------------------------------------------- | --- | -------------------------------------- |
| 3408 | P0  | 카카오톡 연결 / FUNC - 카카오톡 계정 연결         | '카카오 계정 연결하기' 버튼 클릭 시, 카카오톡 연결 화면이 새 창으로 노출되고, 연결 완료 시 화면이 업데이트 된다.              | ⚠️  | collect/bulk-apply-base-setting        |
| 3410 | P0  | 카카오톡 연결 / FUNC - 원들리 채널 친구 추가       | '채널 친구 추가하기' 버튼 클릭 시, 원들리 채널 친구 추가 페이지로 이동한다.                                    | ⚠️  | settings/da-application-manual-add     |
| 3419 | P0  | 카카오톡 연결 / FUNC - 카카오 계정 연결 해제 모달 확인 | '연결 해제' 버튼 클릭 시, 카카오 계정 연결이 해제되고 '연결 설정 > 카카오톡' 화면의 초기 상태로 돌아간다.                 | ⚠️  | collect/open-url-collect-modal-cancel  |
| 3421 | P0  | 카카오톡 연결 / FUNC - 링크 이동              | 카카오톡 주문알림 섹션에서 '실제 알림 화면 미리보기' 링크 클릭 시 외부 페이지로 이동 확인                             | ⚠️  | collect/paginate-collected             |
| 3423 | P0  | 카카오톡 연결 / FUNC - 계정 연결 시작           | 카카오 계정 연결 섹션에서 '카카오 계정 연결하기' 버튼 클릭 시 카카오 로그인 화면으로 이동 확인                          | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 3424 | P0  | 카카오톡 연결 / FUNC - 채널 친구 추가           | 원들리 채널 친구 추가 섹션에서 '채널 친구 추가하기' 버튼 클릭 시 원들리 채널 추가 페이지로 이동 확인                      | ⚠️  | settings/da-application-manual-add     |
| 3427 | P0  | 카카오톡 연결 / FUNC - 플랜 업그레이드           | 기능 제한 모달에서 '프로 플랜으로 모든 제한 풀기' 버튼 클릭 시 플랜 업그레이드 페이지로 이동 확인                        | ⚠️  | collect/open-url-collect-modal-cancel  |
| 3428 | P0  | 카카오톡 연결 / FUNC - 모달 닫기              | 기능 제한 모달에서 '괜찮아요, 그냥 수동으로 확인할게요.' 링크 클릭 시 모달이 닫히는지 확인                            | ⚠️  | collect/open-url-collect-modal-cancel  |
| 3409 | P1  | 카카오톡 연결 / FUNC - 실제 알림 화면 미리보기 링크   | '실제 알림 화면 미리보기' 링크 클릭 시, 해당 링크로 이동한다.                                            | ⚠️  | collect/tmall-single                   |
| 3414 | P1  | 카카오톡 연결 / FUNC - 카카오톡 계정 연결 해제      | '연결 해제' 버튼 클릭 시, '카카오 계정 연결 해제' 모달이 노출된다.                                        | ⚠️  | collect/open-url-collect-modal-cancel  |
| 3418 | P1  | 카카오톡 연결 / FUNC - 카카오 계정 연결 해제 모달 취소 | '취소' 버튼 클릭 시, '카카오 계정 연결 해제' 모달이 닫히고 이전 화면으로 돌아간다.                               | ⚠️  | collect/open-url-collect-modal-cancel  |
| 3422 | P1  | 카카오톡 연결 / FUNC - 모달 노출              | 카카오톡 주문알림 섹션에서 '지금 활성화하기' 버튼 클릭 시 기능 제한 모달 노출 확인                                 | ⚠️  | collect/import-direct-1688-aibuy-popup |
| 3407 | P2  | 카카오톡 연결 / UI - 화면 전체 스냅샷            | '연결 설정 > 카카오톡' 화면 UI는 '카카오톡 알림', '카카오톡 계정 연결 설정', '원들리 채널 친구 추가', '알림 받기 기능 활성화' | ⚠️  | collect/ai-recommend-name              |
| 3411 | P2  | 카카오톡 연결 / UI - 알림 받기 기능 활성화 토글      | '주문알림 받기' 토글 버튼이 노출되며, 초기 상태는 'Off'이다.                                           | ⚠️  | collect/talkstore-point-unit-select    |
| 3412 | P2  | 카카오톡 연결 / UI - 알림 받기 기능 활성화 토글      | 'AI 전세계 상품수집 완료알림 받기' 토글 버튼이 노출되며, 초기 상태는 'Off'이다.                               | ⚠️  | collect/talkstore-point-unit-select    |
| 3413 | P2  | 카카오톡 연결 / UI - 연결된 카카오톡 계정 상태 스냅샷   | 카카오톡 계정이 연결된 상태에서 '카카오톡 계정 연결 설정' 섹션 UI는 '내 카카오톡 계정', 이메일 입력 필드, '연결 해제' 버튼으로 노출 | ⚠️  | collect/ai-recommend-name              |
| 3415 | P2  | 카카오톡 연결 / UI - 알림 받기 기능 활성화 토글      | 카카오톡 계정 연결 후, '주문알림 받기' 토글 버튼이 'On' 상태로 노출된다.                                    | ⚠️  | collect/talkstore-point-amount-input   |
| 3416 | P2  | 카카오톡 연결 / UI - 알림 받기 기능 활성화 토글      | 카카오톡 계정 연결 후, 'AI 전세계 상품수집 완료알림 받기' 토글 버튼이 'On' 상태로 노출된다.                        | ⚠️  | collect/talkstore-point-amount-input   |
| 3417 | P2  | 카카오톡 연결 / UI - 카카오 계정 연결 해제 모달 스냅샷  | '카카오 계정 연결 해제' 모달 UI는 타이틀, 경고 메시지, 확인 메시지, 취소 및 연결 해제 버튼을 포함하여 노출된다.             | ⚠️  | collect/open-url-collect-modal-cancel  |
| 3420 | P2  | 카카오톡 연결 / UI - 화면 전체                | 연결 설정 - 카카오톡 화면 UI 스냅샷 확인                                                        | ⚠️  | collect/ai-recommend-name              |


### 일반 / 윈들리  (15 미작성 / 15 TCs)


| TC# | P   | Sub / Func    | Title             | 상태  | 유사 ATC                                |
| --- | --- | ------------- | ----------------- | --- | ------------------------------------- |
| 812 | P0  | 회원가입 / 업로드 설정 | 회원가입 버튼 선택 후 화면   | ❌   | —                                     |
| 813 | P0  | 회원가입 / 업로드 설정 | 약관동의 모달           | ❌   | —                                     |
| 814 | P0  | 회원가입 / 업로드 설정 | 가입완료 모달           | ⚠️  | e2e/delivery-agency-enter-application |
| 820 | P0  | 회원가입 / 업로드 설정 | 무료체험 시작 버튼 선택     | ❌   | —                                     |
| 824 | P0  | 회원가입 / 업로드 설정 | 무료체험 시작 버튼 선택     | ❌   | —                                     |
| 811 | P1  | 회원가입 / 업로드 설정 | 로그인 화면 회원가입 문구    | ❌   | —                                     |
| 815 | P1  | 회원가입 / 업로드 설정 | 홈으로 이동 선택         | ⚠️  | e2e/order-management-change-status    |
| 816 | P1  | 회원가입 / 업로드 설정 | 무료체험 시작 버튼 선택     | ❌   | —                                     |
| 817 | P1  | 회원가입 / 업로드 설정 | 이메일확인             | ❌   | —                                     |
| 818 | P1  | 회원가입 / 업로드 설정 | 허브에서 해구대 무료체험 선택  | ❌   | —                                     |
| 819 | P1  | 회원가입 / 업로드 설정 | 홈으로 이동 선택         | ⚠️  | e2e/order-management-change-status    |
| 821 | P1  | 회원가입 / 업로드 설정 | 이메일확인             | ❌   | —                                     |
| 822 | P1  | 회원가입 / 업로드 설정 | 허브에서 국내위탁 무료체험 선택 | ❌   | —                                     |
| 823 | P1  | 회원가입 / 업로드 설정 | 홈으로 이동 선택         | ⚠️  | e2e/order-management-change-status    |
| 825 | P1  | 회원가입 / 업로드 설정 | 이메일확인             | ❌   | —                                     |


## 4. 영역 전체 미작성 — TC 상세

### 스스관부가세 / 업로드설정  (42 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                | Title                      |
| ---- | --- | ------------------------- | -------------------------- |
| 3494 | P0  | 스마트스토어 업로드 설정 / 화면 진입     | 스마트스토어 업로드 설정 화면이 정상 진입된다  |
| 3499 | P0  | 스마트스토어 업로드 설정 / 업로드 대상 마켓 | 업로드 대상 마켓 토글이 정상 노출된다      |
| 3500 | P0  | 스마트스토어 업로드 설정 / 업로드 대상 마켓 | 업로드 대상 마켓은 개별 선택 상태를 표시한다  |
| 3501 | P0  | 스마트스토어 업로드 설정 / 업로드 대상 마켓 | 업로드 대상 마켓 토글을 변경할 수 있다     |
| 3515 | P0  | 스마트스토어 업로드 설정 / 관부가세 설정   | 관부가세 설정 영역이 정상 노출된다        |
| 3516 | P0  | 스마트스토어 업로드 설정 / 관부가세 설정   | 관부가세 옵션 3개가 모두 노출된다        |
| 3517 | P0  | 스마트스토어 업로드 설정 / 관부가세 설정   | 관부가세 옵션은 단일 선택으로 동작한다      |
| 3520 | P0  | 쿠팡 업로드 설정 / 상품 고시정보       | 상품 고시정보 드롭다운이 정상 노출된다      |
| 3521 | P0  | 쿠팡 업로드 설정 / 상품 고시정보       | 상품 고시정보를 선택할 수 있다          |
| 3532 | P0  | 공통 / 저장 관련 액션             | 수정한 업로드 설정을 저장할 수 있다       |
| 3533 | P0  | 공통 / 저장 관련 액션             | 저장한 업로드 설정이 재진입 후 유지된다     |
| 3534 | P0  | 공통 / 필수값 검증               | 필수 항목 누락 시 저장이 제한된다        |
| 3495 | P1  | 스마트스토어 업로드 설정 / 상단 기본 UI  | 업로드 설정 화면의 기본 UI가 정상 노출된다  |
| 3498 | P1  | 스마트스토어 업로드 설정 / 경고 배너     | 관부가세 관련 경고 배너가 정상 노출된다     |
| 3502 | P1  | 스마트스토어 업로드 설정 / 모집전 정책 적용 | 모집전 정책 적용 섹션이 정상 노출된다      |
| 3503 | P1  | 스마트스토어 업로드 설정 / 모집전 정책 적용 | 모집전 정책 적용 옵션 토글이 정상 노출된다   |
| 3504 | P1  | 스마트스토어 업로드 설정 / 모집전 정책 적용 | 모집전 정책 적용 옵션을 개별 변경할 수 있다  |
| 3505 | P1  | 스마트스토어 업로드 설정 / 적용된 상품명   | 적용된 상품명 필드가 정상 노출된다        |
| 3506 | P1  | 스마트스토어 업로드 설정 / 적용된 상품명   | 적용된 상품명이 입력 필드에 표시된다       |
| 3507 | P1  | 스마트스토어 업로드 설정 / 적용된 상품명   | 적용된 상품명을 수정할 수 있다          |
| 3509 | P1  | 스마트스토어 업로드 설정 / 리뷰 포인트 설정 | 리뷰 포인트 설정 섹션이 정상 노출된다      |
| 3510 | P1  | 스마트스토어 업로드 설정 / 리뷰 포인트 설정 | 리뷰 포인트 입력 항목이 정상 노출된다      |
| 3511 | P1  | 스마트스토어 업로드 설정 / 리뷰 포인트 설정 | 리뷰 포인트 기본값이 정상 표시된다        |
| 3512 | P1  | 스마트스토어 업로드 설정 / 리뷰 포인트 설정 | 리뷰 포인트 값을 수정할 수 있다         |
| 3513 | P1  | 스마트스토어 업로드 설정 / 리뷰 포인트 설정 | 리뷰 포인트에는 숫자만 입력할 수 있다      |
| 3514 | P1  | 스마트스토어 업로드 설정 / 배송 속성     | 배송 속성 섹션이 정상 노출된다          |
| 3518 | P1  | 스마트스토어 업로드 설정 / 관부가세 설정   | 저장된 관부가세 값이 기본 선택 상태로 표시된다 |
| 3519 | P1  | 쿠팡 업로드 설정 / 섹션 노출         | 쿠팡 업로드 설정 섹션이 정상 노출된다      |
| 3522 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 검색 필터 섹션이 정상 노출된다          |
| 3523 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 검색 필터 액션 버튼이 정상 노출된다       |
| 3524 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 검색 필터 입력 항목이 정상 노출된다       |
| 3525 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 검색 필터 입력 필드에 값을 입력할 수 있다   |
| 3526 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 전체 복사 버튼이 정상 동작한다          |
| 3527 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 붙여넣기 버튼이 정상 동작한다           |
| 3528 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 자동 입력 버튼이 정상 동작한다          |
| 3529 | P1  | 쿠팡 업로드 설정 / 검색 필터         | 전체 삭제 버튼이 정상 동작한다          |
| 3530 | P1  | 공통 / 실시간 상품 에러체크          | 실시간 상품 에러체크 토글이 정상 노출된다    |
| 3531 | P1  | 공통 / 실시간 상품 에러체크          | 실시간 상품 에러체크 토글을 변경할 수 있다   |
| 3496 | P2  | 스마트스토어 업로드 설정 / 상단 탭      | 상단 설정 탭이 정상 노출된다           |
| 3497 | P2  | 스마트스토어 업로드 설정 / 상품 식별 정보  | 상품코드가 화면 상단에 정상 노출된다       |
| 3508 | P2  | 스마트스토어 업로드 설정 / 옵션가 기준    | 옵션가 기준 영역이 정상 노출된다         |
| 3535 | P2  | 공통 / 화면 레이아웃              | 업로드 설정 화면의 섹션 순서가 정상 배치된다  |


### 일반 / 설정  (41 TCs, 전부 미작성)


| TC#  | P   | Sub / Func             | Title               |
| ---- | --- | ---------------------- | ------------------- |
| 1013 | P0  | 공통설정 / 가중치             | 가중치 확인              |
| 1014 | P0  | 공통설정 / 가중치             | 톡스토어 가중치 입력         |
| 1180 | P0  | AI 번역 / 이미지 선번역 화이트리스트 | 기본설정 확인             |
| 1196 | P0  | AI 번역 / AI 이미지 선번역     | 사용 가능한 번역 횟수 확인     |
| 1199 | P0  | 기본설정 / 상하단 이미지         | 상하단 이미지 설정 확인       |
| 1200 | P0  | 기본설정 / 상하단 이미지         | 마켓별 선택              |
| 1201 | P0  | 기본설정 / 상하단 이미지         | 드롭다운 선택             |
| 1205 | P0  | 기본설정 / 상하단 이미지         | 마켓 선택               |
| 1206 | P0  | 기본설정 / 상하단 이미지         | 마켓 선택               |
| 1207 | P0  | 기본설정 / 상하단 이미지         | 마켓 선택               |
| 1208 | P0  | 기본설정 / 상하단 이미지         | 마켓 선택               |
| 1209 | P0  | 기본설정 / 상하단 이미지         | 마켓 선택               |
| 1210 | P0  | 기본설정 / 상하단 이미지         | 마켓 선택               |
| 1211 | P0  | 기본설정 / 상하단 이미지         | 공통 상하단 이미지 사용       |
| 1214 | P0  | 기본설정 / 상하단 이미지         | 마켓별 상하단 이미지 적용      |
| 1215 | P0  | 기본설정 / 상하단 이미지         | 마켓별 상하단 이미지 적용      |
| 1216 | P0  | 기본설정 / 상하단 이미지         | 마켓별 상하단 이미지 적용      |
| 1217 | P0  | 기본설정 / 상하단 이미지         | 마켓별 상하단 이미지 적용      |
| 1218 | P0  | 기본설정 / 상하단 이미지         | 마켓별 상하단 이미지 적용      |
| 1219 | P0  | 기본설정 / 상하단 이미지         | 마켓별 상하단 이미지 적용      |
| 934  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 935  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 936  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 937  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 938  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 939  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 940  | P1  | 연결설정 / 마켓연결            | 마켓연결                |
| 1123 | P1  | 워터마크 / 수정 업로드          | 썸네일 워터마크 적용 후 업로드   |
| 1124 | P1  | 워터마크 / 수정 업로드          | 썸네일 워터마크 미적용 후 업로드  |
| 1181 | P1  | AI 번역 / 이미지 선번역 화이트리스트 | 사용가이드 선택            |
| 1182 | P1  | AI 번역 / AI 이미지 선번역     | 토글 동작 후 모달 확인       |
| 1183 | P1  | AI 번역 / AI 이미지 선번역     | 확인했어요 선택            |
| 1184 | P1  | AI 번역 / AI 이미지 선번역     | 다시표시하지 않기 동작 확인     |
| 1185 | P1  | AI 번역 / AI 이미지 선번역     | 토글 off              |
| 1186 | P1  | AI 번역 / AI 이미지 선번역     | 이미지 번역사용량에 따른 문구 확인 |
| 1187 | P1  | AI 번역 / AI 이미지 선번역     | 이미지 번역사용량에 따른 문구 확인 |
| 1188 | P1  | AI 번역 / AI 이미지 선번역     | 이미지 번역사용량에 따른 문구 확인 |
| 1202 | P1  | 기본설정 / 상하단 이미지         | ? 호버                |
| 1204 | P1  | 기본설정 / 상하단 이미지         | 드로워 확인              |
| 941  | P2  | 연결설정 / 마켓연결            | 마켓연결                |
| 942  | P2  | 연결설정 / 마켓연결            | 마켓연결                |


### 일반 / 온보딩  (37 TCs, 전부 미작성)


| TC# | P   | Sub / Func        | Title                |
| --- | --- | ----------------- | -------------------- |
| 17  | P2  | / 구글              | 1 설문 화면              |
| 18  | P2  | / 구글              | 설문 건너뛰기              |
| 19  | P2  | / 구글              | 2 설문 화면              |
| 20  | P2  | / 구글              | 이전 버튼 선택             |
| 21  | P2  | / 구글              | 3 설문 화면              |
| 22  | P2  | / 구글              | 4 설문 화면              |
| 23  | P2  | / 구글              | 익스텐션 설치 가이드          |
| 24  | P2  | / 구글              | 익스텐션 설치 가이드 건너뛰기     |
| 25  | P2  | / 구글              | 설문 완료                |
| 26  | P2  | / 구글              | 온보딩 모달 확인            |
| 27  | P2  | / 구글              | 기능사용 버튼 선택           |
| 28  | P2  | / 구글              | 상품수집                 |
| 29  | P2  | 가이드 시작 버튼 선택 / 구글 | 가이드 진행               |
| 30  | P2  | 가이드 시작 버튼 선택 / 구글 | 가이드 1단계 버튼 동작        |
| 31  | P2  | 가이드 시작 버튼 선택 / 구글 | 알림 허용                |
| 32  | P2  | 가이드 시작 버튼 선택 / 구글 | 마켓 입점 가이드 확인         |
| 33  | P2  | 가이드 시작 버튼 선택 / 구글 | 마켓 입점 가이드 버튼 동작      |
| 34  | P2  | 가이드 시작 버튼 선택 / ⑥  | 마켓 연결 가이드 확인         |
| 35  | P2  | 가이드 시작 버튼 선택 / ⑥  | 마켓 연결가이드 동작 확인       |
| 36  | P2  | 가이드 시작 버튼 선택 / ⑥  | 스스 출고지 반품지 설정        |
| 37  | P2  | 가이드 시작 버튼 선택 / ⑥  | 쿠팡 연결                |
| 38  | P2  | 가이드 시작 버튼 선택 / ⑥  | 이외 마켓                |
| 39  | P2  | 가이드 시작 버튼 선택 / ⑥  | 온보딩 가이드 완료           |
| 40  | P2  | 가이드 시작 버튼 선택 / ⑥  | 가이드 진행               |
| 41  | P2  | 가이드 시작 버튼 선택 / ⑥  | 마켓 입점 가이드 버튼 동작      |
| 42  | P2  | 가이드 시작 버튼 선택 / ⑥  | 마켓 연결 가이드 확인         |
| 43  | P2  | 가이드 시작 버튼 선택 / ⑥  | 마켓 연결가이드 동작 확인       |
| 44  | P2  | 가이드 시작 버튼 선택 / ⑥  | 스스 출고지 반품지 설정        |
| 45  | P2  | 가이드 시작 버튼 선택 / ⑥  | 쿠팡 연결                |
| 46  | P2  | 가이드 시작 버튼 선택 / ⑥  | 이외 마켓                |
| 47  | P2  | 가이드 시작 버튼 선택 / ⑥  | 온보딩 가이드 완료           |
| 48  | P2  | 가이드 시작 버튼 선택 / ⑥  | 상품수집                 |
| 49  | P2  | 가이드 시작 버튼 선택 / ⑥  | 상품 업로드               |
| 50  | P2  | 가이드 시작 버튼 선택 / ⑥  | _x0008_홈화면 온보딩 베너 진행 |
| 51  | P2  | 가이드 시작 버튼 선택 / ⑥  | 포인트 받기               |
| 52  | P2  | 가이드 시작 버튼 선택 / ⑥  | 포인트 확인               |
| 53  | P2  | 여기까지 온보딩 / ⑥      | 결제 시 포인트 적용 확인       |


### 일반 / 유입수 분석  (37 TCs, 전부 미작성)


| TC#  | P   | Sub / Func       | Title                |
| ---- | --- | ---------------- | -------------------- |
| 1115 | P0  | 등록상품 상세 / 수정 업로드 | 톡스토어 유입수 분석          |
| 1116 | P0  | 등록상품 상세 / 수정 업로드 | 톡스토어 그래프 확인          |
| 1117 | P0  | 등록상품 상세 / 수정 업로드 | 상품 리스트 확인            |
| 1118 | P0  | 등록상품 상세 / 수정 업로드 | 정렬                   |
| 723  | P2  | 상세 / 업로드 설정      | 유입수 분석 페이지 진입        |
| 724  | P2  | 상세 / 업로드 설정      | 유입수 분석 페이지 진입        |
| 725  | P2  | 상세 / 업로드 설정      | 유입수 분석 페이지 진입        |
| 726  | P2  | 상세 / 업로드 설정      | 유입수 분석 페이지 진입        |
| 727  | P2  | 상세 / 업로드 설정      | 전체, 모바일, pc 버튼 선택    |
| 728  | P2  | 상세 / 업로드 설정      | 날짜 변경                |
| 729  | P2  | 상세 / 업로드 설정      | 일별 프리셋 확인            |
| 730  | P2  | 상세 / 업로드 설정      | 일별 날짜 선택 확인          |
| 731  | P2  | 상세 / 업로드 설정      | 주별 프리셋 확인            |
| 732  | P2  | 상세 / 업로드 설정      | 주별 날짜 선택 확인          |
| 733  | P2  | 상세 / 업로드 설정      | 월별 프리셋 확인            |
| 734  | P2  | 상세 / 업로드 설정      | 월별 날짜 선택 확인          |
| 735  | P2  | 상세 / 업로드 설정      | 세부적인 일 선택            |
| 736  | P2  | 상세 / 업로드 설정      | 일 복합 선택              |
| 737  | P2  | 상세 / 업로드 설정      | 세부적인 주 선택            |
| 738  | P2  | 상세 / 업로드 설정      | 주 복합 선택              |
| 739  | P2  | 상세 / 업로드 설정      | 세부적인 월 선택            |
| 740  | P2  | 상세 / 업로드 설정      | 월 복합 선택              |
| 741  | P2  | 상세 / 업로드 설정      | 날짜 직접 입력             |
| 742  | P2  | 상세 / 업로드 설정      | 분석 조건 초기화 버튼 선택      |
| 743  | P2  | 상세 / 업로드 설정      | 차트 마우스 오버            |
| 744  | P2  | 상세 / 업로드 설정      | 최근 업데이트 시간 변경        |
| 745  | P2  | 상세 / 업로드 설정      | 마켓 표 선택              |
| 746  | P2  | 상세 / 업로드 설정      | 유입수 0인 상품 보기         |
| 747  | P2  | 상세 / 업로드 설정      | 리스트에서 체크             |
| 748  | P2  | 상세 / 업로드 설정      | 정렬 선택                |
| 749  | P2  | 상세 / 업로드 설정      | 차트 아이콘 선택            |
| 750  | P2  | 상세 / 업로드 설정      | 마켓 아이콘 열에 숫자 선택      |
| 751  | P2  | 상세 / 업로드 설정      | 마켓 아이콘 열에 - 선택       |
| 752  | P2  | 상세 / 업로드 설정      | 페이지 이동               |
| 753  | P2  | 상세 / 업로드 설정      | 상품 유입수가 0일 때 차트 확인   |
| 754  | P2  | 상세 / 업로드 설정      | 선택한 상품의 유입수가 0일 때 확인 |
| 755  | P2  | 상세 / 업로드 설정      | 등록상품에서 유입수 차트 버튼 선택  |


### 일반 / ai 챗봇  (29 TCs, 전부 미작성)


| TC#  | P   | Sub / Func     | Title                         |
| ---- | --- | -------------- | ----------------------------- |
| 1127 | P0  | 워터마크 / 수정 업로드  | 챗봇 버튼 노출 확인                   |
| 1128 | P0  | 워터마크 / 수정 업로드  | 버튼 선택                         |
| 1129 | P0  | 워터마크 / 수정 업로드  | 질문 검색                         |
| 1130 | P0  | 워터마크 / 수정 업로드  | 답변 완료                         |
| 1131 | P0  | 워터마크 / 수정 업로드  | 새로운 대화 선택                     |
| 1132 | P0  | 워터마크 / 수정 업로드  | 관련 문서 링크 선택                   |
| 1133 | P0  | 워터마크 / 수정 업로드  | 관련 질문 선택                      |
| 1134 | P0  | 워터마크 / 수정 업로드  | 답변 도중 입력                      |
| 1135 | P0  | 워터마크 / 수정 업로드  | 답변 도중 질문 전송                   |
| 1136 | P2  | view3 / 수정 업로드 | 홈 페이지에서 윈비 선택                 |
| 1137 | P2  | view3 / 수정 업로드 | 상품수집 페이지에서 윈비 선택              |
| 1138 | P2  | view3 / 수정 업로드 | AI 전세계 상품수집 페이지에서 윈비 선택       |
| 1139 | P2  | view3 / 수정 업로드 | 1688 상품 검색 페이지에서 윈비 선택        |
| 1140 | P2  | view3 / 수정 업로드 | 재고 업데이트 페이지에서 윈비 선택           |
| 1141 | P2  | view3 / 수정 업로드 | 상품 순위 분석 페이지에서 윈비 선택          |
| 1142 | P2  | view3 / 수정 업로드 | 주문 관리 페이지에서 윈비 선택             |
| 1143 | P2  | view3 / 수정 업로드 | 문의 관리 페이지에서 윈비 선택             |
| 1144 | P2  | view3 / 수정 업로드 | 취소/교환/반품 관리 페이지에서 윈비 선택       |
| 1145 | P2  | view3 / 수정 업로드 | 배송대행지 페이지에서 윈비 선택             |
| 1146 | P2  | view3 / 수정 업로드 | 통관고유부호 조회 페이지에서 윈비 선택         |
| 1147 | P2  | view2 / 수정 업로드 | 수집상품 페이지에서 윈비 선택              |
| 1148 | P2  | view2 / 수정 업로드 | 등록상품 페이지에서 윈비 선택              |
| 1149 | P2  | view2 / 수정 업로드 | 유입수 분석 페이지에서 윈비 선택            |
| 1150 | P2  | view2 / 수정 업로드 | 직원관리 페이지에서 윈비 선택              |
| 1151 | P2  | view2 / 수정 업로드 | 내 계정 페이지에서 윈비 선택              |
| 1152 | P2  | view2 / 수정 업로드 | 작업 환경 설정 페이지에서 윈비 선택          |
| 1153 | P2  | view2 / 수정 업로드 | [제목 없음] - 2026-01-16 02:55:55 |
| 1154 | P2  | view2 / 수정 업로드 | [제목 없음] - 2026-01-16 02:55:55 |
| 1155 | P2  | view2 / 수정 업로드 | [제목 없음] - 2026-01-16 02:55:55 |


### 일반 / 재고업데이트  (28 TCs, 전부 미작성)


| TC# | P   | Sub / Func  | Title                 |
| --- | --- | ----------- | --------------------- |
| 679 | P2  | 상세 / 업로드 설정 | 재고업데이트 탭 선택           |
| 680 | P2  | 상세 / 업로드 설정 | 기능 동작 확인              |
| 681 | P2  | 상세 / 업로드 설정 | 재고 업데이트 화면 확인         |
| 682 | P2  | 상세 / 업로드 설정 | 상품 검색                 |
| 683 | P2  | 상세 / 업로드 설정 | 상품 검색                 |
| 684 | P2  | 상세 / 업로드 설정 | 상품 코드 검색              |
| 685 | P2  | 상세 / 업로드 설정 | 리스트 정렬 항목 마우스 호버      |
| 686 | P2  | 상세 / 업로드 설정 | 최근 업로드 상품 제외          |
| 687 | P2  | 상세 / 업로드 설정 | 최근 업로드 상품 제외          |
| 688 | P2  | 상세 / 업로드 설정 | 상품 검색                 |
| 689 | P2  | 상세 / 업로드 설정 | 상품 검색 중 이탈            |
| 690 | P2  | 상세 / 업로드 설정 | 검색 완료 화면              |
| 691 | P2  | 상세 / 업로드 설정 | 버튼 동작                 |
| 692 | P2  | 상세 / 업로드 설정 | 상품 다시 선택              |
| 693 | P2  | 상세 / 업로드 설정 | 재고 상세 보기 선택           |
| 694 | P2  | 상세 / 업로드 설정 | 재고 변동시 리스트 노출         |
| 695 | P2  | 상세 / 업로드 설정 | 옵션 없는 상품 재고 확인        |
| 696 | P2  | 상세 / 업로드 설정 | 재고 다시 불러오기            |
| 697 | P2  | 상세 / 업로드 설정 | 재고 업데이트               |
| 698 | P2  | 상세 / 업로드 설정 | 뱃지 별 툴팁 문구            |
| 699 | P2  | 상세 / 업로드 설정 | 옵션그룹 추가한 상품 재고 업데이트   |
| 700 | P2  | 상세 / 업로드 설정 | 옵션 그룹 삭제한 상품 재고 업데이트  |
| 701 | P2  | 상세 / 업로드 설정 | 옵션 추가한 상품 재고 업데이트     |
| 702 | P2  | 상세 / 업로드 설정 | 옵션 삭제한 상품 재고 업데이트     |
| 703 | P2  | 상세 / 업로드 설정 | 옵션명 변경한 상품 재고 업데이트    |
| 704 | P2  | 상세 / 업로드 설정 | 옵션그룹명 변경한 상품 재고 업데이트  |
| 705 | P2  | 상세 / 업로드 설정 | 재고 0인 옵션 있는 상품 업로드    |
| 706 | P2  | 상세 / 업로드 설정 | 재고 상세 드로워에서 옵션가 기준 변경 |


### 인 상 추 / 상품추천  (27 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                        | Title                                               |
| ---- | --- | --------------------------------- | --------------------------------------------------- |
| 3734 | P2  | LNB / 메뉴 노출                       | LNB '인기 상품 추천' 메뉴 노출 및 New 뱃지 확인                    |
| 3735 | P2  | 인기 상품 추천 페이지 / 페이지 제목             | 화면 제목 '인기 상품 추천' 노출 확인                              |
| 3736 | P2  | 인기 상품 추천 페이지 / 상단 안내              | 상단 설명 문구 및 '가이드 보러가기' 링크 노출 확인 (변경 내용 반영)           |
| 3737 | P2  | 인기 상품 추천 페이지 / 가이드 링크             | 상단 설명 문구의 '가이드 보러가기' 링크 클릭 시 기능 확인                  |
| 3738 | P2  | 인기 상품 추천 페이지 / 섹션 타이틀             | '지금 잘 팔리는 상품 키워드 Top 20' 타이틀 노출 확인                  |
| 3739 | P2  | 인기 상품 추천 페이지 / 키워드 탭              | 키워드 탭 목록 및 '귀여운 가방' 선택 상태 확인                        |
| 3740 | P2  | 인기 상품 추천 페이지 / 섹션 타이틀             | '선택 키워드 귀여운 가방' 섹션 타이틀 노출 확인                        |
| 3741 | P2  | 인기 상품 추천 페이지 / 정렬 옵션              | 상품 정렬 옵션 '추천순' 선택 상태 확인                             |
| 3742 | P2  | 인기 상품 추천 페이지 / 상품 카드              | 각 상품 카드 정보 (썸네일, 라벨, 상품명, 가격) 노출 확인                 |
| 3743 | P2  | 인기 상품 추천 페이지 / 정보 툴팁              | 상품 카드 내 정보 아이콘(i) 호버 시 툴팁 노출 확인                     |
| 3744 | P2  | 인기 상품 추천 페이지 / 비슷한 상품찾기 버튼        | 상품 카드 내 '이 상품과 비슷한 상품찾기' 버튼 노출 확인                   |
| 3745 | P2  | 비슷한 상품 찾기 모달 / 모달 열기              | '이 상품과 비슷한 상품찾기' 버튼 클릭 시 모달 노출 확인                   |
| 3746 | P2  | 비슷한 상품 찾기 모달 / 모달 헤더              | '비슷한 상품 찾기' 모달 제목 및 설명 문구 노출 확인                     |
| 3747 | P2  | 비슷한 상품 찾기 모달 / 선택 상품 정보           | '비슷한 상품 찾기' 모달 내 선택 상품 정보 노출 확인                     |
| 3748 | P2  | 비슷한 상품 찾기 모달 / 수집몰 탭              | '비슷한 상품 찾기' 모달 내 수집몰 탭 목록 및 '1688' 선택 상태 확인         |
| 3749 | P2  | 비슷한 상품 찾기 모달 / 상품 카드              | '비슷한 상품 찾기' 모달 내 상품 카드 목록 노출 확인 (이미지 유사도 기준 반영)     |
| 3750 | P2  | 비슷한 상품 찾기 모달 / 상품 카드 상세           | '비슷한 상품 찾기' 모달 내 각 상품 카드 정보 (썸네일, 상품명, 가격) 노출 확인    |
| 3751 | P2  | 비슷한 상품 찾기 모달 / 상품 수집 버튼           | '비슷한 상품 찾기' 모달 내 상품 카드 호버 시 '상품 수집' 버튼 노출 확인        |
| 3752 | P2  | 비슷한 상품 찾기 모달 / 닫기 버튼              | '비슷한 상품 찾기' 모달 내 '닫기' 버튼 노출 확인                      |
| 3753 | P2  | 비슷한 상품 찾기 모달 / 모달 닫기              | '비슷한 상품 찾기' 모달 내 '닫기' 버튼 클릭 시 모달 닫힘 확인              |
| 3754 | P2  | 비슷한 상품 찾기 모달 / 상품 수집 (정상 케이스)     | '상품 수집' 버튼 클릭 시 로딩 스피너 및 성공 토스트 메시지 노출 확인           |
| 3755 | P2  | 비슷한 상품 찾기 모달 / 상품 수집 (로그인 필요)     | '상품 수집' 버튼 클릭 시 소싱몰 로그인 미비로 인한 수집 실패 (음성 케이스)       |
| 3756 | P2  | 비슷한 상품 찾기 모달 / 상품 수집 (확장 프로그램 필요) | '상품 수집' 버튼 클릭 시 윈들리 확장 프로그램 비활성화로 인한 수집 실패 (음성 케이스) |
| 3757 | P2  | 비슷한 상품 찾기 모달 / 상품 수집 (중복)         | '상품 수집' 버튼 클릭 시 이미 수집된 상품임을 알리는 메시지 노출 (음성 케이스)     |
| 3758 | P2  | 인기 상품 추천 페이지 / 로딩 상태              | 페이지 로딩 중 로딩 UI 노출 확인                                |
| 3759 | P2  | 인기 상품 추천 페이지 / 에러 상태              | 키워드 기반 상품 불러오기 실패 시 에러 UI 노출 및 다시시도 버튼 확인 (음성 케이스)  |
| 3760 | P2  | 인기 상품 추천 페이지 / 에러 복구              | 키워드 기반 상품 불러오기 실패 시 '다시시도' 버튼 클릭 시 재시도 확인           |


### 일반 / AI 전세계 상품수집  (20 TCs, 전부 미작성)


| TC# | P   | Sub / Func   | Title          |
| --- | --- | ------------ | -------------- |
| 967 | P0  | 모달 / 수집요청    | 모달 확인          |
| 968 | P0  | 모달 / 수집결과    | 수집 결과 화면       |
| 969 | P0  | 모달 / 수집요청    | 링크 추가          |
| 970 | P0  | 모달 / 수집요청    | 수집요청           |
| 971 | P0  | 모달 / 수집요청    | LNB 확인         |
| 972 | P0  | 모달 / 수집결과    | AI 전세계 상품수집 선택 |
| 973 | P0  | 모달 / 수집결과    | 전송 모달          |
| 974 | P0  | 모달 / 수집결과    | 상품 전송          |
| 975 | P0  | 모달 / 수집결과    | 상품 확인          |
| 982 | P0  | 모달 / 수집결과    | 수집 결과 확인       |
| 984 | P0  | 모달 / 수집결과    | 수집상품으로 전송      |
| 985 | P0  | 모달 / 수집요청    | 상품수집 요청 링크 변경  |
| 986 | P0  | 상품 전송 / 수집상품 | 수집된 상품 확인      |
| 981 | P1  | 모달 / 수집요청    | 수집요청           |
| 983 | P1  | 모달 / 수집결과    | 수집실패 사유        |
| 976 | P2  | 모달 / 수집요청    | 수집요청 개수 확인     |
| 977 | P2  | 모달 / 수집요청    | 수집요청 개수 확인     |
| 978 | P2  | 모달 / 수집요청    | 수집요청 개수 확인     |
| 979 | P2  | 모달 / 수집요청    | 수집요청 개수 확인     |
| 980 | P2  | 모달 / 수집요청    | 상품수집 요청 목록 채우기 |


### 일반 / 플랜결제  (18 TCs, 전부 미작성)


| TC#  | P   | Sub / Func            | Title            |
| ---- | --- | --------------------- | ---------------- |
| 1165 | P0  | 결제모달 / 옵션이미지 배경지우기    | 옵션이미지 모달 확인      |
| 1166 | P0  | 결제모달 / 옵션이미지 배경지우기    | 모달 버튼 확인         |
| 1167 | P0  | 결제모달 / 옵션이미지 배경지우기    | 배경지우기 버튼 동작      |
| 1168 | P0  | 결제모달 / HTML           | 수집방식 확인          |
| 1169 | P0  | 결제모달 / HTML           | 상품수집             |
| 1170 | P0  | 결제모달 / HTML           | 상품 정보 확인         |
| 1171 | P0  | 결제모달 / HTML           | api 방식 수집        |
| 1172 | P0  | 결제모달 / HTML           | 수집방식 확인          |
| 1173 | P0  | 결제모달 / HTML           | 상품수집             |
| 1174 | P0  | 결제모달 / HTML           | 상품 정보 확인         |
| 1175 | P0  | 결제모달 / 이미지 선번역 화이트리스트 | 기본설정 확인          |
| 1176 | P0  | 결제모달 / 이미지 선번역 화이트리스트 | 이미지 선번역 설정       |
| 1177 | P0  | 결제모달 / 이미지 선번역 화이트리스트 | 이미지 선번역 설정       |
| 1178 | P0  | 결제모달 / 이미지 선번역 화이트리스트 | 이미지 선번역 설정       |
| 1179 | P0  | 결제모달 / 이미지 선번역 화이트리스트 | 이미지 선번역 설정       |
| 1162 | P2  | 결제 안내모달 / 수정 업로드      | 플랜 결제안내 모달 문구 수정 |
| 1163 | P2  | 결제모달 / 수정 업로드         | 플랜 결제 모달 문구 확인   |
| 1164 | P2  | 결제모달 / 수정 업로드         | 플랜 결제 모달 문구 확인   |


### 일반 / 상품 순위 분석  (16 TCs, 전부 미작성)


| TC# | P   | Sub / Func  | Title           |
| --- | --- | ----------- | --------------- |
| 707 | P2  | 상세 / 업로드 설정 | 상품 순위 분석 페이지 진입 |
| 708 | P2  | 상세 / 업로드 설정 | 분석 상품 없을 때      |
| 709 | P2  | 상세 / 업로드 설정 | 분석 요청           |
| 710 | P2  | 상세 / 업로드 설정 | 분석 요청 선택        |
| 711 | P2  | 상세 / 업로드 설정 | 추적 키워드 선택       |
| 712 | P2  | 상세 / 업로드 설정 | 동작              |
| 713 | P2  | 상세 / 업로드 설정 | 분석 요청           |
| 714 | P2  | 상세 / 업로드 설정 | 요청 완료           |
| 715 | P2  | 상세 / 업로드 설정 | 키워드 선택          |
| 716 | P2  | 상세 / 업로드 설정 | 요청 가능한 횟수 소진    |
| 717 | P2  | 상세 / 업로드 설정 | 상품 순위 분석 확인 페이지 |
| 718 | P2  | 상세 / 업로드 설정 | 키워드 순위          |
| 719 | P2  | 상세 / 업로드 설정 | 순위 변경           |
| 720 | P2  | 상세 / 업로드 설정 | 상품 순위 상세 보기     |
| 721 | P2  | 상세 / 업로드 설정 | 분석중인 상품 재 분석 시도 |
| 722 | P2  | 상세 / 업로드 설정 | 랭킹 조회 횟수 소진 시   |


### 일반 / 문의관리  (16 TCs, 전부 미작성)


| TC# | P   | Sub / Func  | Title                      |
| --- | --- | ----------- | -------------------------- |
| 780 | P2  | 상세 / 업로드 설정 | 직원 정보 수정에서 고객문의 관리 확인      |
| 781 | P2  | 상세 / 업로드 설정 | 권한 부여 받은 직원 계정 고객문의 접근     |
| 782 | P2  | 상세 / 업로드 설정 | 권한 부여 받지 않은 직원 계정 고개 문의 접근 |
| 783 | P2  | 상세 / 업로드 설정 | 고객 문의 관리 선택                |
| 784 | P2  | 상세 / 업로드 설정 | 버튼 기능 동작                   |
| 785 | P2  | 상세 / 업로드 설정 | 검색 결과 없는 리스트               |
| 786 | P2  | 상세 / 업로드 설정 | 미답변 리스트 확인                 |
| 787 | P2  | 상세 / 업로드 설정 | 문의 상세 확인                   |
| 788 | P2  | 상세 / 업로드 설정 | 문의 답변 입력                   |
| 789 | P2  | 상세 / 업로드 설정 | 문의 상세 확인                   |
| 790 | P2  | 상세 / 업로드 설정 | 문의 답변 입력                   |
| 791 | P2  | 상세 / 업로드 설정 | 답변 완료 탭                    |
| 792 | P2  | 상세 / 업로드 설정 | 답변 수정                      |
| 793 | P2  | 상세 / 업로드 설정 | 답변 수정                      |
| 794 | P2  | 상세 / 업로드 설정 | 답변 삭제                      |
| 795 | P2  | 상세 / 업로드 설정 | 답변 삭제                      |


### 일반 / 취소/교환/반품 관리  (15 TCs, 전부 미작성)


| TC# | P   | Sub / Func  | Title              |
| --- | --- | ----------- | ------------------ |
| 796 | P2  | 상세 / 업로드 설정 | 취소/교환/반품 관리 마우스 호버 |
| 797 | P2  | 상세 / 업로드 설정 | 취소/교환/반품 관리 마우스 호버 |
| 798 | P2  | 상세 / 업로드 설정 | 취소/교환/반품 관리 마우스 호버 |
| 799 | P2  | 상세 / 업로드 설정 | 취소/교환/반품 관리 LNB 확인 |
| 800 | P2  | 상세 / 업로드 설정 | 취소/교환/반품 관리 진입     |
| 801 | P2  | 상세 / 업로드 설정 | 버튼 기능 동작           |
| 802 | P2  | 상세 / 업로드 설정 | 취소/교환/반품 관리 진입     |
| 803 | P2  | 상세 / 업로드 설정 | 클레임 유형 확인          |
| 804 | P2  | 상세 / 업로드 설정 | 요청 탭 리스트 확인        |
| 805 | P2  | 상세 / 업로드 설정 | 요청 탭 리스트 확인        |
| 806 | P2  | 상세 / 업로드 설정 | 요청 탭 리스트 확인        |
| 807 | P2  | 상세 / 업로드 설정 | 주문정보가 없는 케이스       |
| 808 | P2  | 상세 / 업로드 설정 | 취소 플로우             |
| 809 | P2  | 상세 / 업로드 설정 | 교환 플로우             |
| 810 | P2  | 상세 / 업로드 설정 | 반품 플로우             |


### 일반 / 로그인  (11 TCs, 전부 미작성)


| TC# | P   | Sub / Func | Title       |
| --- | --- | ---------- | ----------- |
| 6   | P2  | / 이메일      | 이메일 로그인     |
| 7   | P2  | / 이메일      | 이메일 로그인     |
| 8   | P2  | / 네이버      | 네이버 로그인     |
| 9   | P2  | / 네이버      | 네이버 로그인     |
| 10  | P2  | / 네이버      | 네이버 로그인     |
| 11  | P2  | / 구글       | 구글 로그인      |
| 12  | P2  | / 구글       | 구글 로그인      |
| 13  | P2  | / 구글       | 구글 로그인      |
| 14  | P2  | / 이메일      | 회원가입 실패     |
| 15  | P2  | / 네이버      | 네이버 회원가입 시도 |
| 16  | P2  | / 구글       | 구글 회원가입 시도  |


### 인기 상품 추천 개선 / 상품카드  (11 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                  | Title                         |
| ---- | --- | --------------------------- | ----------------------------- |
| 3689 | P1  | 상품목록 / 관심 고객 수 (1~50회)      | 클릭 수 1~50회 관심 고객 수 문구 확인      |
| 3690 | P1  | 상품목록 / 관심 고객 수 (51~100회)    | 클릭 수 51~100회 관심 고객 수 문구 확인    |
| 3691 | P1  | 상품목록 / 관심 고객 수 (101~300회)   | 클릭 수 101~300회 관심 고객 수 문구 확인   |
| 3692 | P1  | 상품목록 / 관심 고객 수 (301~500회)   | 클릭 수 301~500회 관심 고객 수 문구 확인   |
| 3693 | P1  | 상품목록 / 관심 고객 수 (501~1000회)  | 클릭 수 501~1000회 관심 고객 수 문구 확인  |
| 3694 | P1  | 상품목록 / 관심 고객 수 (1001~2000회) | 클릭 수 1001~2000회 관심 고객 수 문구 확인 |
| 3695 | P1  | 상품목록 / 관심 고객 수 경계값 (50회)    | 클릭 수 50회 경계값 문구 확인            |
| 3696 | P1  | 상품목록 / 관심 고객 수 경계값 (51회)    | 클릭 수 51회 경계값 문구 확인            |
| 3662 | P2  | 상품목록 / 가격 설명 문구             | 상품 카드 가격 설명 문구 노출 확인          |
| 3663 | P2  | 상품목록 / 관심 고객 수 영역           | 관심 고객 수 문구 영역 노출 확인           |
| 3664 | P2  | 상품목록 / 관심 고객 수 미노출          | 클릭 수 0회 상품 - 관심 문구 미노출 확인     |


### AI 대표이미지 생성 / 사용량정책  (11 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                      | Title                           |
| ---- | --- | ------------------------------- | ------------------------------- |
| 3717 | P0  | 플랜별사용량 / 무료체험 월 2회              | 무료체험 플랜 잔여 사용량 월 2회 확인          |
| 3718 | P0  | 플랜별사용량 / 스타터 미제공                | 스타터 플랜에서 AI 대표이미지 생성 기능 미제공 확인  |
| 3719 | P0  | 플랜별사용량 / 라이트 미제공                | 라이트 플랜에서 AI 대표이미지 생성 기능 미제공 확인  |
| 3720 | P0  | 플랜별사용량 / 프로 월 10회               | 프로 플랜 잔여 사용량 월 10회 확인           |
| 3721 | P0  | 플랜별사용량 / 커스텀 월 20회              | 커스텀 플랜 잔여 사용량 월 20회 확인          |
| 3722 | P0  | 차감정책 / 윈들리 귀책 실패 시 사용량 미차감      | 윈들리 귀책 이미지 생성 실패 시 사용량 차감 없음 확인 |
| 3725 | P0  | 충전정책 / 월간 플랜 사용량 충전             | 월간 플랜 재결제 시점(오전 10시) 사용량 충전 확인  |
| 3726 | P0  | 충전정책 / 연간 플랜 사용량 충전             | 연간 플랜 결제일 기준 +1달 주기 사용량 충전 확인   |
| 3723 | P1  | 소진정책 / 사용량 소진 시 모달 접속 가능        | 사용량 소진 시 모달 접속 가능 확인            |
| 3724 | P1  | 소진정책 / 사용량 소진 시 이미지 생성하기 버튼 비활성 | 사용량 소진 시 이미지 생성하기 버튼 클릭 불가 확인   |
| 3708 | P2  | 모달 / 사용량 소진 시 버튼 disabled       | 사용량 소진 시 이미지 생성하기 버튼 비활성화 표시 확인 |


### 일반 / 상세페이지  (10 TCs, 전부 미작성)


| TC# | P   | Sub / Func     | Title         |
| --- | --- | -------------- | ------------- |
| 842 | P0  | 이미지편집 / 이미지에디터 | 모자이크 버튼 선택    |
| 843 | P0  | 이미지편집 / 이미지에디터 | 브러시 크기 조절     |
| 844 | P0  | 이미지편집 / 이미지에디터 | 모자이크 강도 선택    |
| 845 | P0  | 이미지편집 / 이미지에디터 | 모자이크 실행 버튼 선택 |
| 846 | P0  | 이미지편집 / 이미지에디터 | 초기화 버튼 선택     |
| 847 | P0  | 이미지편집 / 이미지에디터 | 이전 버튼 선택      |
| 848 | P0  | 이미지편집 / 이미지에디터 | 끝내기 버튼 선택     |
| 849 | P0  | 이미지 / 이미지에디터   | 상세페이지 확인      |
| 840 | P1  | 이미지편집 / 이미지에디터 | 이미지에디터에서 확인   |
| 841 | P1  | 이미지편집 / 이미지에디터 | 모자이크 버튼 호버    |


### 인기 상품 추천 개선 / 유사상품  (9 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                 | Title                                |
| ---- | --- | -------------------------- | ------------------------------------ |
| 3680 | P0  | 소싱몰선택 / 타오바오 선택            | 타오바오 선택 후 유사 상품 조회                   |
| 3681 | P0  | 소싱몰선택 / 1688 선택            | 1688 선택 후 유사 상품 조회                   |
| 3682 | P0  | 소싱몰선택 / 소싱몰 전환 (타오바오→1688) | 소싱몰 타오바오→1688 전환 시 목록 갱신             |
| 3683 | P0  | 소싱몰선택 / 소싱몰 전환 (1688→타오바오) | 소싱몰 1688→타오바오 전환 시 목록 갱신             |
| 3684 | P0  | 상품카드 / 타오바오 상품명 표시         | 타오바오 상품명 중국어 원문 노출 확인                |
| 3685 | P0  | 상품카드 / 타오바오 평점 미노출         | 타오바오 상품 카드 평점 미노출 확인                 |
| 3686 | P0  | 캐싱 / 동일 요청 재호출             | 동일 상품·소싱몰 재조회 시 캐시 반환 확인             |
| 3665 | P2  | 소싱몰선택 / 소싱몰 선택 UI          | 이 상품과 비슷한 상품 찾기 클릭 시 소싱몰 선택 UI 노출 확인 |
| 3666 | P2  | 소싱몰선택 / 기본 선택 상태           | 소싱몰 선택 UI 기본값 확인                     |


### 인기 상품 추천 개선 / 추천키워드  (8 TCs, 전부 미작성)


| TC#  | P   | Sub / Func             | Title                    |
| ---- | --- | ---------------------- | ------------------------ |
| 3674 | P0  | 키워드목록 / 키워드 개수         | 추천 키워드 20개 노출            |
| 3675 | P0  | 키워드목록 / 키워드 선택 후 상품 조회 | 키워드 선택 시 상품 목록 조회        |
| 3676 | P0  | 상품목록 / 키워드당 상품 개수      | 키워드당 추천 상품 24개 노출        |
| 3677 | P0  | 키워드목록 / A/B 테스트 분기     | A/B 테스트 그룹별 키워드 개수 분기 확인 |
| 3678 | P0  | 어드민 / 키워드 교체 주기 설정     | 어드민 키워드 교체 주기 1주 설정      |
| 3679 | P0  | 어드민 / 키워드 교체 반영        | 1주 후 키워드 목록 변경 확인        |
| 3660 | P2  | 키워드목록 / 키워드 개수         | 추천 키워드 20개 노출 확인         |
| 3661 | P2  | 키워드목록 / 키워드 선택 상태      | 키워드 선택 시 선택 상태 UI 확인     |


### AI 대표이미지 생성 / AI생성모달  (8 TCs, 전부 미작성)


| TC#  | P   | Sub / Func              | Title                       |
| ---- | --- | ----------------------- | --------------------------- |
| 3699 | P2  | 모달 / 상품명 노출             | 모달 내 상품명 노출 확인              |
| 3700 | P2  | 모달 / 잔여 사용량 노출          | 모달 내 잔여 사용량 노출 확인           |
| 3701 | P2  | 모달 / 프롬프트 입력 필드         | 프롬프트 입력 필드 노출 확인            |
| 3702 | P2  | 모달 / 이미지 생성하기 버튼        | 이미지 생성하기 버튼 노출 확인           |
| 3703 | P2  | 모달 / 기존 대표이미지 노출        | 모달 내 기존 대표이미지 노출 확인         |
| 3704 | P2  | 모달 / AI 생성 이미지 영역 초기 상태 | AI 생성 이미지 영역 초기 상태 확인       |
| 3705 | P2  | 모달 / AI 생성 이미지 적용하기 버튼  | AI가 생성한 대표이미지 적용하기 버튼 노출 확인 |
| 3706 | P2  | 모달 / 취소 버튼              | 취소 버튼 노출 확인                 |


### AI 대표이미지 생성 / 이미지생성  (6 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                 | Title                                    |
| ---- | --- | -------------------------- | ---------------------------------------- |
| 3712 | P0  | 프롬프트 / 프롬프트 미입력 시 생성 불가    | 프롬프트 미입력 시 이미지 생성하기 버튼 클릭 불가 처리          |
| 3713 | P0  | 이미지 생성 / 생성 요청 및 사용량 차감    | 이미지 생성하기 버튼 클릭 시 생성 시작 및 사용량 1회 차감       |
| 3714 | P0  | 이미지 생성 / 생성 완료 후 AI 이미지 노출 | 이미지 생성 완료 시 AI 생성 이미지 모달 내 노출            |
| 3715 | P0  | 이미지 적용 / AI 생성 이미지 적용하기    | AI가 생성한 대표이미지 적용하기 클릭 시 대표이미지 교체 및 모달 닫힘 |
| 3716 | P0  | 취소 / 취소 버튼 클릭              | 취소 버튼 클릭 시 대표이미지 교체 없이 모달 닫힘             |
| 3707 | P2  | 로딩화면 / 생성 중 로딩 UI          | 이미지 생성 중 로딩 UI 노출 확인                     |


### 일반 / 회원가입  (5 TCs, 전부 미작성)


| TC# | P   | Sub / Func | Title            |
| --- | --- | ---------- | ---------------- |
| 1   | P2  | / 이메일      | 윈들리 이메일 회원가입     |
| 2   | P2  | / 네이버      | 윈들리 소셜(네이버) 회원가입 |
| 3   | P2  | / 네이버      | 윈들리 소셜(네이버) 회원가입 |
| 4   | P2  | / 구글       | 윈들리 소셜(구글) 회원가입  |
| 5   | P2  | / 구글       | 윈들리 소셜(구글) 회원가입  |


### 일반 / 상품  (5 TCs, 전부 미작성)


| TC#  | P   | Sub / Func | Title                |
| ---- | --- | ---------- | -------------------- |
| 1193 | P0  | 상품상세 / 이미지 | 이미지 선번역 설정           |
| 1194 | P0  | 상품상세 / 이미지 | 이미지 선번역 설정           |
| 1195 | P0  | 상품상세 / 이미지 | 이미지 선번역 설정           |
| 1197 | P0  | 상품상세 / 이미지 | 사용 가능한 번역 횟수 소진 후 수집 |
| 1198 | P0  | 상품상세 / 이미지 | 사용 가능한 번역 횟수 소진 후 수집 |


### 일반 / 홈  (4 TCs, 전부 미작성)


| TC# | P   | Sub / Func | Title      |
| --- | --- | ---------- | ---------- |
| 54  | P2  | 홈화면시작 / ⑥  | 홈 화면       |
| 55  | P2  | 홈화면시작 / ⑥  | 홈 화면 세부 확인 |
| 56  | P2  | 홈화면시작 / ⑥  | 홈화면 기능 확인  |
| 57  | P2  | 홈화면시작 / ⑥  | 홈화면 기능 확인  |


### 일반 / 수집  (4 TCs, 전부 미작성)


| TC#  | P   | Sub / Func        | Title         |
| ---- | --- | ----------------- | ------------- |
| 1190 | P0  | 벌크수집 / AI 이미지 선번역 | 벌크 수집 모달에서 확인 |
| 1191 | P0  | 벌크수집 / AI 이미지 선번역 | 벌크 수집 모달에서 확인 |
| 1192 | P0  | 벌크수집 / AI 이미지 선번역 | 벌크 수집 모달에서 확인 |
| 1212 | P0  | 상품상세 / 상하단이미지     | 상품 상세에서 확인    |


### 인기 상품 추천 개선 / 로딩오류  (4 TCs, 전부 미작성)


| TC#  | P   | Sub / Func         | Title                  |
| ---- | --- | ------------------ | ---------------------- |
| 3667 | P2  | 로딩화면 / 키워드 선택 후 로딩 | 키워드 선택 후 로딩 UI 노출 확인   |
| 3668 | P2  | 로딩화면 / 유사 상품 조회 로딩 | 유사 상품 조회 시 로딩 UI 노출 확인 |
| 3669 | P2  | 오류화면 / 빈 상태        | 빈 상태 UI 노출 확인          |
| 3670 | P2  | 오류화면 / API 오류      | API 오류 시 오류 UI 노출 확인   |


### 일반 / 게정관리  (3 TCs, 전부 미작성)


| TC# | P   | Sub / Func | Title |
| --- | --- | ---------- | ----- |
| 58  | P2  | 홈화면시작 / ⑥  | 계정 관리 |
| 59  | P2  | 홈화면시작 / ⑥  | 계정 관리 |
| 60  | P2  | 홈화면시작 / ⑥  | 계정 관리 |


### 일반 / 공통설정  (3 TCs, 전부 미작성)


| TC# | P   | Sub / Func   | Title             |
| --- | --- | ------------ | ----------------- |
| 856 | P0  | 상세페이지 / 워터마크 | 기본설정에서 워터마크 설정 확인 |
| 857 | P2  | 상세페이지 / 워터마크 | 사이즈 미리보기          |
| 858 | P2  | 상세페이지 / 워터마크 | 사이즈 미리보기          |


### 인기 상품 추천 개선 / 해상도  (3 TCs, 전부 미작성)


| TC#  | P   | Sub / Func      | Title            |
| ---- | --- | --------------- | ---------------- |
| 3671 | P2  | 페이지 / 1440 레이아웃 | 1440 해상도 레이아웃 확인 |
| 3672 | P2  | 페이지 / 1600 레이아웃 | 1600 해상도 레이아웃 확인 |
| 3673 | P2  | 페이지 / 1920 레이아웃 | 1920 해상도 레이아웃 확인 |


### 인기 상품 추천 개선 / 트래킹  (3 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                      | Title                                                            |
| ---- | --- | ------------------------------- | ---------------------------------------------------------------- |
| 3687 | P0  | 유사상품 / sourcingMall 프로퍼티        | Similar Product Search Button Clicked 이벤트 sourcingMall 값 확인      |
| 3688 | P0  | 유사상품 / sourcingMall 프로퍼티 (1688) | Similar Product Search Button Clicked 이벤트 sourcingMall 1688 값 확인 |
| 3697 | P1  | 키워드목록 / selectedKeyword 프로퍼티    | Popular Product Keyword Selected 이벤트 selectedKeyword 값 확인        |


### AI 대표이미지 생성 / 진입버튼  (3 TCs, 전부 미작성)


| TC#  | P   | Sub / Func               | Title                            |
| ---- | --- | ------------------------ | -------------------------------- |
| 3710 | P0  | 이미지탭 / 수집상품 모달 오픈        | 수집상품에서 AI 대표이미지 생성 버튼 클릭 시 모달 오픈 |
| 3711 | P0  | 이미지탭 / 등록상품 모달 오픈        | 등록상품에서 AI 대표이미지 생성 버튼 클릭 시 모달 오픈 |
| 3698 | P2  | 이미지탭 / AI 대표이미지 생성 버튼 위치 | AI 대표이미지 생성 버튼 노출 위치 확인          |


### AI 대표이미지 생성 / 이미지편집  (3 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                | Title                               |
| ---- | --- | ------------------------- | ----------------------------------- |
| 3727 | P0  | 이미지편집기 / AI 생성 이미지 편집기 편집 | AI 생성 이미지를 이미지 편집기에서 편집 가능 확인       |
| 3728 | P0  | 개별변형 / AI 생성 이미지 개별 변형    | AI 생성 이미지 수집/등록상품 페이지에서 개별 변형 가능 확인 |
| 3729 | P0  | 일괄변형 / AI 생성 이미지 일괄 변형    | AI 생성 이미지 수집/등록상품 페이지에서 일괄 변형 가능 확인 |


### AI 대표이미지 생성 / 트래킹  (3 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                               | Title                                                             |
| ---- | --- | ---------------------------------------- | ----------------------------------------------------------------- |
| 3731 | P1  | 이미지탭 / AI Thumbnail Generation Started 이 | AI 대표이미지 생성 버튼 클릭 시 AI Thumbnail Generation Started 이벤트 발생 확인     |
| 3732 | P1  | 이미지생성 / AI Thumbnail Generation Succeede | 이미지 생성 완료 시 AI Thumbnail Generation Succeeded 이벤트 및 프로퍼티 확인       |
| 3733 | P1  | 이미지적용 / AI Generated Thumbnail Applied 이 | AI 생성 대표이미지 적용하기 버튼 클릭 시 AI Generated Thumbnail Applied 이벤트 발생 확인 |


### 일반 / 계정  (2 TCs, 전부 미작성)


| TC#  | P   | Sub / Func    | Title |
| ---- | --- | ------------- | ----- |
| 1119 | P0  | 직원계정 / 수정 업로드 | 상품업로드 |
| 1120 | P0  | 직원계정 / 수정 업로드 | 상품업로드 |


### 일반 / 상품 복제  (2 TCs, 전부 미작성)


| TC#  | P   | Sub / Func    | Title |
| ---- | --- | ------------- | ----- |
| 1121 | P0  | 직원계정 / 수정 업로드 | 상품 복제 |
| 1122 | P0  | 직원계정 / 수정 업로드 | 상품 복제 |


### AI 대표이미지 생성 / 이미지탭  (2 TCs, 전부 미작성)


| TC#  | P   | Sub / Func                     | Title                                        |
| ---- | --- | ------------------------------ | -------------------------------------------- |
| 3730 | P0  | 상세페이지붙여넣기 / 대표이미지 상세페이지 앞부분 추가 | 상세페이지 탭으로 붙여넣기 버튼 클릭 시 대표이미지가 상세페이지 앞부분에 추가됨 |
| 3709 | P2  | 이미지탭 / 상세페이지 탭으로 붙여넣기 버튼       | 상세페이지 탭으로 붙여넣기 버튼 노출 확인                      |


### 일반 / 내 계정  (1 TCs, 전부 미작성)


| TC#  | P   | Sub / Func         | Title            |
| ---- | --- | ------------------ | ---------------- |
| 1189 | P0  | AI 번역 / AI 이미지 선번역 | 내 계정에서 선번역 횟수 확인 |


### 일반 / 상품상세  (1 TCs, 전부 미작성)


| TC#  | P   | Sub / Func     | Title      |
| ---- | --- | -------------- | ---------- |
| 1203 | P1  | 상세페이지 / 상하단이미지 | 상품 상세에서 확인 |


### 일반 / 계정 관리d  (1 TCs, 전부 미작성)


| TC#  | P   | Sub / Func             | Title                    |
| ---- | --- | ---------------------- | ------------------------ |
| 3406 | P2  | 카카오 계정 연결 해제 / UI - 모달 | 카카오 계정 연결 해제 모달 팝업 노출 확인 |



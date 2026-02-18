# MDX 아키텍처 및 동작 원리 설명서

이 문서는 현재 프로젝트(`korean-guide`)에서 MDX 파일이 어떻게 웹 페이지로 변환되는지, 그 기술적 원리와 데이터 흐름을 설명합니다.

## 1. 핵심 기술 스택

| 기술 | 역할 |
|---|---|
| **MDX (Markdown JSX)** | 마크다운 문서 안에서 React 컴포넌트를 직접 사용할 수 있게 해주는 포맷입니다. |
| **next-mdx-remote/rsc** | 서버 컴포넌트(Server Components) 환경에서 MDX를 파싱하고 리액트 요소로 변환해주는 핵심 라이브러리입니다. |
| **gray-matter** | MDX 파일 상단의 `---` 로 감싸진 메타 데이터(Frontmatter)를 파싱합니다. (제목, 날짜, 설명 등) |
| **rehype-pretty-code** | 코드 블록(` ``` `)을 분석하여 예쁜 구문 강조(Syntax Highlighting)를 입혀줍니다. (Shiki 기반) |
| **remark-gfm** | GitHub 스타일의 마크다운 문법(표, 체크리스트 등)을 지원합니다. |

---

## 2. 데이터 흐름 (Data Flow)

사용자가 브라우저에서 `/guides/nestjs/01-intro` 주소로 접속했을 때, 서버 내부에서는 다음과 같은 일이 일어납니다.

### 1단계: 라우팅 및 파일 찾기 (`src/app/guides/[category]/[slug]/page.tsx`)
Next.js의 App Router가 URL 파라미터(`category`, `slug`)를 받아옵니다.
```typescript
const guide = await getGuideBySlug(category, slug);
```

### 2단계: 파일 읽기 및 메타 데이터 분리 (`src/lib/mdx.ts`)
`getGuideBySlug` 함수는 실제 파일 시스템에서 파일을 읽어옵니다.
1. `fs.readFileSync`로 `.mdx` 파일 내용을 문자열로 읽습니다.
2. `gray-matter`를 사용하여 **Frontmatter(메타데이터)**와 **Content(본문)**를 분리합니다.
   - **Frontmatter**: 제목, 날짜 등
   - **Content**: 실제 마크다운 본문

   - **Content**: 실제 마크다운 본문

### 💡 Q. gray-matter가 뭔가요?
**텍스트 파일의 메타데이터 추출기**입니다.

텍스트 파일의 **가장 윗부분** 에 있는 `---` (대시 3개)로 감싸진 영역을 **Frontmatter** 라고 부르는데, 이것만 쏙 뽑아내서 자바스크립트 객체(`JSON`)로 바꿔주는 라이브러리입니다.

**사용 예시:**
```markdown
---
title: 내 첫 글
date: 2024-01-01
---
# 안녕하세요
```
`gray-matter`는 위 내용을 아래와 같이 분리해줍니다.
1. **데이터**: `{ title: '내 첫 글', date: '2024-01-01' }`
2. **본문**: `# 안녕하세요`

우리가 글 목록을 보여줄 때 파일 전체를 다 읽지 않고 이 제목/날짜만 필요할 때 아주 유용합니다.

### 3단계: MDX 컴파일 (`src/lib/mdx.ts` -> `compileMDX`)
가장 중요한 단계입니다. 문자열 형태의 본문을 리액트 컴포넌트로 변환합니다.
```typescript
const { content } = await compileMDX({
    source: fileContent,
    options: {
        parseFrontmatter: true,
        mdxOptions: {
            remarkPlugins: [remarkGfm],      // 1. 표, 체크리스트 등 표준 문법 변환
            rehypePlugins: [
                [rehypePrettyCode, ...]      // 2. 코드 블록에 색상 입히기 (HTML 변환)
            ],
        },
    },
    components: { ... } // 3. 커스텀 컴포넌트 주입 (예: AdBanner)
});
```
이 과정이 끝나면 `content`는 단순한 문자열이 아니라, **실행 가능한 React Element 객체**가 됩니다.

### 💡 Q. compileMDX와 플러그인들은 어떻게 동작하나요?

**1. compileMDX**
`next-mdx-remote/rsc`에서 가져온 함수로, **"MDX 문자열 → 리액트 컴포넌트 트리"** 로 변환하는 공장장 역할을 합니다. 서버 컴포넌트(Server Component) 환경에서 이 변환 작업을 수행하여 브라우저에는 결과물(HTML/JS)만 보냅니다.

**2. 플러그인 시스템 (Remark vs Rehype)**
MDX 변환 과정은 크게 두 단계로 나뉩니다.

*   **1단계 (Markdown 처리): Remark (`remarkGfm`)**
    *   `remark` 플러그인이 담당합니다.
    *   **remarkGfm**: GitHub Flavored Markdown의 약자입니다. 일반 마크다운에는 없는 **표(Table), 취소선(~~text~~), 체크박스([ ])** 같은 문법을 인식하게 해줍니다.

*   **2단계 (HTML 변환 후 처리): Rehype (`rehypePrettyCode`)**
    *   `rehype` 플러그인이 담당합니다.
    *   **rehypePrettyCode**: 코드 블록(` ``` `)을 만나면, 단순히 `<pre>` 태그로 두지 않고 **VS Code처럼 알록달록하게 문법 강조(Syntax Highlighting)** 를 해서 HTML 스타일을 입혀줍니다.
    *   `Shiki`라는 강력한 엔진을 사용하여 빌드 타임에 스타일을 완성하므로, 페이지 로딩 시 반짝거리는 현상(FOUC)이 없습니다.

### 4단계: 렌더링 (`page.tsx`)
변환된 `guide.content`를 페이지 컴포넌트에서 그대로 렌더링합니다.
```tsx
<article className="prose ...">
    {guide.content}
</article>
```
이때 Tailwind CSS의 `prose` (typography 플러그인) 클래스가 자동으로 예쁜 스타일을 입혀줍니다.

### 💡 Q. prose가 뭔가요?
**"마크다운 본문에 예쁜 스타일을 한방에 입혀주는 마법의 클래스"** 입니다. (~@tailwindcss/typography~)

*   **문제점**: Tailwind CSS를 쓰면 기본적으로 모든 태그(`<h1>`, `<p>`, `<ul>` 등)의 스타일이 **초기화(Reset)** 되어 아무런 디자인이 없는 상태가 됩니다.
*   **해결책**: 마크다운 본문은 우리가 직접 클래스를 붙일 수 없는데(`<h1>`에 `text-xl` 등을 일일이 붙일 수 없음), **`prose`** 클래스를 상위 태그에 붙이면 **자식 요소들에 대해 미리 정의된 "예쁜 타이포그래피 스타일 세트"** 를 한방에 적용해줍니다.
*   **역할**: "이 안은 마크다운 글이니까 알아서 H1은 크게, P는 적당히, 리스트는 점 찍어서 보여줘"라고 명령하는 것입니다.

---

## 3. 왜 이 방식이 좋은가요?
1. **서버 사이드 렌더링 (SSG)**: 빌드 타임에 미리 HTML로 다 변환되므로 로딩이 매우 빠르고 SEO에 유리합니다.
2. **보안**: `eval`을 사용하지 않고 안전하게 마크다운을 변환합니다.
3. **유연성**: 마크다운 파일 중간에 `<AdBanner />` 같은 리액트 컴포넌트를 마음대로 넣을 수 있습니다.

## 4. 파일 구조 요약
- `content/`: 실제 글(.mdx)들이 저장되는 곳
- `src/lib/mdx.ts`: 파일을 읽고 변환하는 엔진 (핵심 로직)
- `src/app/guides/.../page.tsx`: 변환된 결과를 화면에 뿌려주는 뷰(View)

### 💡 Q. MDX는 자주 쓰나요? 직접 뷰어를 만들진 않나요?

**1. MDX는 현재 업계 표준(Standard)에 가깝습니다.**
React나 Next.js 생태계에서 기술 블로그나 문서 사이트를 만들 때 **가장 널리 사용되는 기술**입니다. 
*   **사용 사례**: Next.js 공식 문서, Tailwind CSS 문서, 수많은 개발자 블로그(Vercel, Toast UI 등)가 MDX 기반으로 만들어져 있습니다.
*   **이유**: 단순 텍스트(마크다운)와 인터랙티브 기능(React 컴포넌트)을 섞어 쓸 수 있는 거의 유일하고 강력한 대안이기 때문입니다.

**2. 왜 밑바닥부터(From Scratch) 만들지 않을까요?**
마크다운 파서(변환기)를 직접 만드는 것은 **매우 어렵고 비효율적** 입니다.
*   **복잡성**: 마크다운은 정규식(Regex) 몇 개로 처리할 수 없을 만큼 문법이 복잡합니다. (중첩 리스트, 코드 블록 내의 특수문자 처리, HTML 태그 혼용 등)
*   **보안**: 잘못 만들면 XSS(교차 사이트 스크립팅) 공격에 취약해집니다.
*   **생태계**: 이미 전 세계 개발자들이 다듬어놓은 **`unified` (remark, rehype)** 생태계가 너무 강력합니다. 이걸 가져다 조립(Configuration)해서 쓰는 것이 훨씬 안정적이고 기능이 풍부합니다. 

즉, **"바퀴를 다시 발명하지 마라(Don't reinvent the wheel)"**는 격언처럼, 검증된 엔진(`next-mdx-remote`)을 가져와서 우리 입맛에 맞게 커스터마이징하는 것이 가장 현명한 방법입니다.
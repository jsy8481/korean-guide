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
2. `gray-matter`를 사용하여 **Frontmatter(메타데이터)** 와 **Content(본문)** 를 분리합니다.
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

### 💡 Q. @tailwindcss/typography는 별도의 CSS 라이브러리인가요?
엄밀히 말하면 **Tailwind CSS의 공식 플러그인**입니다. 하지만 역할만 놓고 보면 **"글쓰기 전용 미니 CSS 프레임워크"** 라고 봐도 무방합니다.

*   **일반 CSS 라이브러리 (Bootstrap 등)**: 버튼, 카드, 네비게이션 등 UI 컴포넌트 전체를 위한 스타일을 제공합니다.
*   **@tailwindcss/typography**: 오직 **"글(Typography)"**을 예쁘게 보여주는 것에만 집중합니다.
    *   `h1`, `h2`, `p`, `ul`, `ol`, `blockquote`, `code`, `pre` 등 문서 태그들의 크기, 자간, 행간, 색상 등을 전문가가 조정한 비율(Prose)로 미리 세팅해 둡니다.
    *   우리가 `className="text-xl font-bold mb-4"` 처럼 일일이 지정하지 않아도, `prose` 클래스 하나만으로 책처럼 잘 읽히는 디자인을 완성해 줍니다.

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

### 💡 Q. MDX 기반으로 사용자용 에디터(WYSIWYG)를 만들 수 있나요?
**가능하지만, 난이도가 꽤 높습니다.**

일반 마크다운 에디터는 많지만, **리액트 컴포넌트(`<Counter />`)가 섞인 문서**를 시각적으로 편집하는 것은 기술적으로 복잡합니다.

**구현 방식 3가지:**
1.  **Split View (가장 현실적)**: 왼쪽엔 코드(Source), 오른쪽엔 미리보기(Preview)를 두는 방식. (현재 우리가 개발하는 방식과 동일)
2.  **전용 위지윅 라이브러리 사용**: `MDXEditor` 같은 라이브러리를 도입하면 노션처럼 블록 기반으로 편집할 수 있습니다.
3.  **Headless CMS**: 아예 편집은 CMS(Sanity, Notion 등)에서 하고, 결과물만 MDX로 변환해서 뿌려주는 방식.

보통 실무에서는 **"개발자는 코드로(VS Code), 기획자는 CMS로"** 역할을 나누는 것이 일반적입니다.

### 💡 Q. MDX 에디터에 커스텀 컴포넌트도 삽입할 수 있나요?
**네, 강력하게 지원합니다.**

MDX의 존재 이유가 바로 **"마크다운 + 컴포넌트"**이기 때문입니다. 에디터에서도 이를 시각적으로 처리할 수 있습니다.

*   **Slash Command**: 노션처럼 `/`를 눌러서 'Callout', 'Youtube Embed' 같은 커스텀 컴포넌트를 메뉴에서 선택해 삽입할 수 있습니다.
*   **Preview**: 에디터 내에서 `<Counter />` 같은 코드를 작성하면, 즉시 실제 동작하는 버튼(UI)으로 렌더링해서 보여줄 수 있습니다. (`Sandpack` 같은 기술 활용)
*   **Props 편집**: 컴포넌트의 속성(Props)을 사이드바나 팝업 UI로 쉽게 수정하게 만들 수도 있습니다.

단, 이를 구현하려면 에디터 라이브러리(MDXEditor, Remirror 등)의 **플러그인 시스템**을 깊게 공부해서 커스터마이징해야 합니다.

### 💡 Q. MDX 에디터에서 코드 블록(Code Block)은 어떻게 삽입하나요?
**두 가지 방식**이 있습니다.

**1. 마크다운 문법 직접 입력 (Backticks)**
- 개발자에게 가장 익숙한 방식입니다.
- 백틱 3개(```)를 입력하고 언어 이름을 쓰면 자동으로 코드 블록 UI로 변환됩니다.
  > **주의**: 이 기능은 에디터마다 다릅니다. 예를 들어 `MDXEditor`의 경우 **`codeBlockPlugin`**과 **`markdownShortcutPlugin`**을 모두 활성화해야 백틱 입력 시 자동 변환이 동작합니다. (데모 페이지 설정에 따라 안 될 수도 있습니다)

**2. UI 버튼 / 명령어 사용**
- `/code` 같은 명령어를 치거나 툴바의 `< >` 버튼을 눌러서 삽입합니다.
- 내부는 `Sandpack`이나 `CodeMirror`, `Monaco Editor` 같은 전문 코드 에디터를 임베딩해서 보여줍니다.
- 이렇게 하면 **실시간 문법 강조(Syntax Highlighting)**와 **자동 완성** 기능까지 에디터 안에서 제공할 수 있습니다.

### 💡 Q. 글 중간에 자동으로 광고를 넣고 싶어요. (사용자가 수정 못하게)
**"렌더링 시점(Rendering Time)"에 주입하는 것이 정답입니다.**

에디터에서 사용자가 직접 광고 컴포넌트를 넣게 하면 사용자가 지워버릴 수도 있고, 위치를 마음대로 바꿀 수도 있습니다. 따라서 저장된 원본 MD계에는 광고 코드가 없어야 합니다.

**구현 방법 (Rehype Plugin 활용):**
1.  사용자는 순수하게 글만 작성하고 저장합니다.
2.  서버에서 MDX를 HTML로 변환할 때(`compileMDX`), **커스텀 Rehype 플러그인**을 하나 끼워넣습니다.
3.  이 플러그인이 **"문단(Paragraph) 태그가 5번 나올 때마다 그 뒤에 `<AdBanner />`를 추가해라"** 같은 로직을 수행합니다.
4.  결과적으로 사용자는 광고를 전혀 신경 쓰지 않아도, 뷰어에는 자동으로 광고가 삽입되어 나옵니다.

이 방식은 **유지보수** 면에서도 뛰어납니다. 나중에 광고 위치를 바꾸고 싶으면 플러그인 설정만 수정하면 모든 글에 일괄 적용되기 때문입니다.

### 💡 Q. 에디터 UI(툴팁, 링크 설명 등)를 한글로 바꾸고 싶어요.
**Localization(다국어 지원) 기능을 사용해야 합니다.**

**팩트 체크: `MDXEditor`는 공식적으로 `translation` prop을 지원합니다.**
이 prop에 번역 함수를 전달하면, 에디터 내부의 모든 텍스트(툴팁, 다이얼로그 등)를 한글로 교체할 수 있습니다. `i18next`와 호환되는 구조입니다.

**예시 코드:**
```tsx
const koreanTranslations = {
  'toolbar.bold': '굵게',
  'toolbar.italic': '이탤릭',
  'link.url': '링크 주소',
  // ... 필요한 키값들을 찾아 매핑
};

<MDXEditor
  marketing={false}
  translation={(key, defaultValue, interpolations) => {
    return koreanTranslations[key] || defaultValue || key;
  }}
/>
```
공식 문서나 GitHub에서 `locales` 파일을 찾아보면 전체 키(Key) 목록을 확인할 수 있습니다.

### 💡 Q. MDXEditor는 무료인가요?
**네, 100% 무료이며 오픈소스(MIT License)입니다.**

개인 프로젝트는 물론 **상업적 용도(회사 제품)**로 사용해도 전혀 문제가 없습니다.
단, 기술 지원(Technical Support)이 필요한 경우 유료 스폰서십 모델이 있긴 하지만, 에디터 기능 자체에는 제약이 없습니다.

### 💡 Q. MDXEditor를 쓰면 서버에 저장되는 데이터 구조는 어떻게 되나요?
**놀랍게도 "그냥 평범한 문자열(String)"**입니다.

Notion이나 Editor.js 같은 블록 에디터들은 복잡한 JSON 객체(`{ type: 'paragraph', content: [...] }`)를 DB에 저장하지만, `MDXEditor`는 **표준 마크다운 텍스트**를 입출력으로 사용합니다.

**실제 DB 저장 예시:**
```markdown
# 제목
안녕하세요, **강조**된 텍스트입니다.

<Counter startingValue={5} />
```
DB의 `content` 컬럼(TEXT 타입)에 위 문자열이 그대로 들어갑니다. 덕분에 데이터를 마이그레이션하거나 다른 곳에서 쓰기가 매우 편합니다. (Vendor Lock-in 없음)

### 💡 [시나리오] 커스텀 "차트 컴포넌트" 만들기
사용자가 글 작성 중에 "매출 통계 차트"를 삽입하는 상황을 가정해 보겠습니다.

**1. 편집 경험 (Editing Experience)**
- 사용자가 에디터 툴바에서 `📊 차트 추가` 버튼을 누릅니다.
- 팝업이 뜨고, 사용자가 엑셀처럼 데이터를 입력합니다. (X축: 1월, 2월... / Y축: 100, 200...)
- **즉시 에디터 본문에** 실제 그래프가 그려집니다. (코드 형태 X, 그래프 형태 O)
- 그래프를 클릭하면 다시 수정할 수 있는 설정창이 뜹니다.

**2. 데이터 저장 구조 (What stored in DB)**
에디터는 화려한 그래프를 보여주지만, 저장은 **심플한 텍스트**로 합니다.
```jsx
<LineChart
  title="2024년 1분기 매출"
  color="#FF0000"
  data={[
    { label: '1월', value: 100 },
    { label: '2월', value: 200 },
    { label: '3월', value: 150 }
  ]}
/>
```

**3. 개발자가 구현해야 할 것들**
이 시나리오를 위해 3가지가 필요합니다.
1.  **뷰어용 컴포넌트 (`LineChart.tsx`)**: 실제로 화면에 그래프를 그려주는 React 컴포넌트. (Recharts 등 사용)
2.  **에디터용 설정 (Descriptor)**: 에디터에게 "LineChart라는게 있고, title이랑 data라는 속성을 받아"라고 알려주는 정의 파일.
3.  **속성 편집 UI (Property Editor)**: 사용자가 JSON을 직접 짤 수 없으니, 데이터를 쉽게 입력받는 **폼(Form) UI**를 만들어야 합니다.

### 💡 Q. 눈에는 차트가 보이지만, 저장은 `<LineChart ... />` 텍스트로 되나요?
**네, 정답입니다! (직렬화/Serialization)**

이것이 MDX 에디터의 핵심 마법입니다.
- **[화면]**: 에디터가 `<LineChart ... />`라는 텍스트를 발견하면, 즉시 그 자리에 **실제 그래프 컴포넌트**를 끼워 넣어서 보여줍니다. (사용자는 텍스트를 못 봅니다)
- **[저장]**: 사용자가 그래프 데이터를 수정하고 '저장'을 누르면, 에디터는 다시 그 그래프를 `<LineChart data={...} />` 라는 **문자열로 변환**해서 서버에 보냅니다.

- **[저장]**: 사용자가 그래프 데이터를 수정하고 '저장'을 누르면, 에디터는 다시 그 그래프를 `<LineChart data={...} />` 라는 **문자열로 변환**해서 서버에 보냅니다.

즉, **"사용자는 화려한 UI를 보지만, DB는 깔끔한 텍스트만 갖는다"**는 것이 가장 큰 장점입니다.

### 💡 Q. 뷰어에서는 어떻게 `<LineChart />`를 실제 차트로 보여주나요?
**"컴포넌트 매핑(Component Mapping)" 설정이 필요합니다.**

MDX 엔진은 기본적으로 `<LineChart>`가 뭔지 모릅니다. 그래서 "이 이름이 나오면 저 컴포넌트를 그려라"라고 알려주는 과정이 필요합니다.

**구현 코드 예시 (`src/app/guides/[slug]/page.tsx`):**
```tsx
import { compileMDX } from 'next-mdx-remote/rsc';
// 1. 실제 차트 컴포넌트 불러오기
import LineChart from '@/components/LineChart';

export default async function Page({ params }) {
  // ... 파일 읽기 로직 ...

  const { content } = await compileMDX({
    source: mdxSource,
    // 2. MDX 엔진에게 "LineChart" 단어와 실제 컴포넌트 연결해주기
    components: {
      LineChart: LineChart,
      // 여기에 H1, Image 등 기본 태그도 덮어쓸 수 있음
    },
  });

  return <article>{content}</article>;
}
```
이렇게 **`components` 속성**에 등록만 해주면, MDX 파일 안에 있는 `<LineChart ... />` 텍스트가 마법처럼 실제 React 컴포넌트로 변환되어 실행됩니다.

### 💡 Q. MDXEditor에서 "속성 편집 UI(Property Editor)"는 어떻게 구현하나요?
**`FloatingToolbar`와 `PropertyEditor` 컴포넌트를 조합하여 만듭니다.**

`MDXEditor`는 **"어떤 컴포넌트가 사용되었는지"**만 알고 있습니다. 그 컴포넌트의 속성(Props)을 시각적으로 편집하는 UI는 직접 제공하지 않기 때문에, 개발자가 만들어야 합니다.

**구현 단계:**
1.  **컴포넌트 정의**: `LineChart` 같은 컴포넌트를 만들 때, `title`, `data` 같은 속성을 명시합니다.
2.  **Descriptor 등록**: 에디터에게 "이 컴포넌트는 이런 속성을 가진다"고 알려줍니다.
3.  **FloatingToolbar 설정**: 사용자가 그래프를 클릭했을 때 떠오를 툴바에 **"속성 편집(Edit Properties)"** 버튼을 추가합니다.
4.  **PropertyEditor 렌더링**: 해당 버튼을 누르면, 등록된 Descriptor를 바탕으로 **자동으로 폼(Form)**을 그려주는 `PropertyEditor` 컴포넌트를 띄웁니다.

**핵심 코드 예시:**
```tsx
// 1. 컴포넌트와 Descriptor 정의
const lineChartDescriptor: ComponentDescriptor = {
  name: 'LineChart',
  props: [
    { name: 'title', type: 'string' },
    { name: 'data', type: 'array' },
  ],
};

// 2. 툴바에 버튼 추가
<FloatingToolbar>
  <EditButton />
  <PropertyEditor descriptor={lineChartDescriptor} />
</FloatingToolbar>
```
이렇게 하면 사용자는 코드를 몰라도, 클릭만으로 그래프 속성을 수정할 수 있게 됩니다.

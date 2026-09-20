# Content Model

## Person

```text
name
headline
shortBio
longBio
location (only if user wants it public)
email (only if user wants it public)
socialLinks
profileImage (optional)
```

## Experience

```text
company
title
startDate
endDate
location
summary
responsibilities[]
technologies[]
achievements[]
```

## Project

```text
title
slug
summary
description
status
technologies[]
category
featured
github
demo
architecture
highlights[]
```

## Lab

```text
title
slug
category
summary
problem
motivation
theory
architecture
implementation
results
lessons
technologies[]
github
demo
status
```

## Blog post

```text
title
slug
description
pubDate
updatedDate
category
tags[]
heroImage
draft
featured
canonicalUrl
externalUrl
```

## Content governance

Every content item should have:

- Source
- Author
- Last reviewed date
- Draft/published state

For imported Medium posts, preserve attribution and canonical metadata as appropriate.

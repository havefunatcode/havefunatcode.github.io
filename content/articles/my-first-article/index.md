---
title: "How to java compose data structure Set?"
description: "How to java compose data structure Set?"
date: "2021-05-28"
banner:
  src: ""
  alt: ""
  caption: ""
categories:
  - "Java"
  - "Data Structure"
keywords:
  - "Java"
  - "HashSet"
---

### How to java compose data structure Set?

- Java는 HashSet Class를 생성할 때 HashMap 객체를 생성하고 이를 Set처럼 사용한다.
- Java 17 Version의 Util Package의 HashSet 클래스의 Constructor는 다음과 같다.

  ```java
    public HashSet() {
        map = new HashMap<>();
    }

    public HashSet(Collection<? extends E> c) {
        map = new HashMap<>(Math.max((int) (c.size()/.75f) + 1, 16));
        addAll(c);
    }

    public HashSet(int initialCapacity, float loadFactor) {
        map = new HashMap<>(initialCapacity, loadFactor);
    }

    public HashSet(int initialCapacity) {
        map = new HashMap<>(initialCapacity);
    }

    HashSet(int initialCapacity, float loadFactor, boolean dummy) {
        map = new LinkedHashMap<>(initialCapacity, loadFactor);
    }
  ```

### Why?

- 왜 Java에서는 Set을 직접 구현하지 않고 HashMap을 Set으로 사용할까?  
  => 필자는 두 데이터 구조의 유사성과 중복코드의 방지라고 생각한다.
- Set과 HashMap의 경우 Hash 알고리즘을 사용하여 key의 중복을 허락하지 않는다.  
  -> Data Structure의 유사성과 이를 구현하기 위해 사용되는 알고리즘이 동일하기 때문에 Set을 구현할 때 HashMap을 사용한다면 유사한 로직을 다시 구현할 필요가 없기 때문에 유지보수성이 향상될 것이라고 생각한다.

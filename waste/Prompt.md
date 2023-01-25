Write javascript and regex that converts the following (1) HTML and returns markdown text that follows the following (2) template. In my template markdown file, I’ve placed `{{}}` curly bracket expressions around placeholders, indicating the HTML tag’s content from which that placeholder should get its information. They also indicate if/else conditions. On various lines, I’ve left `//` comments indicating what the output for the line should look like in this particular case.

Here is the (1) HTML:
```
<body>
		<div class="bodyContainer">
				<div class="notebookFor">
						Notebook Export
				</div>
				<div class="bookTitle">
						The Artist's Way - 25th Anniversary Edition
				</div>
				<div class="authors">
						Julia Cameron
				</div>
				<div class="citation">

				</div>
				<hr />
				<div class="sectionHeading">
						Week 1: Recovering a Sense of Safety
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Shadow Artists > Location 824
				</div>
				<div class="noteText">
						Timid young artists, adding parental fears to their own, often give up their sunny dreams of artistic careers, settling into the twilight world of could-have-beens and regrets. There, caught between the dream of action and the fear of failure, shadow artists are born.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Shadow Artists > Location 833
				</div>
				<div class="noteText">
						Nothing has a stronger influence psychologically on their environment and especially on their children than the unlived life of the parent. C. G. JUNG
				</div>
				<div class="noteHeading">
						Note - Shadow Artists > Location 834
				</div>
				<div class="noteText">
						Unfortunately this really rings true for me
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Shadow Artists > Location 904
				</div>
				<div class="noteText">
						the fledgling artist behaves with well-practiced masochism. Masochism is an art form long ago mastered, perfected during the years of self-reproach; this habit is the self-hating bludgeon with which a shadow artist can beat himself right back into the shadows.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Shadow Artists > Location 907
				</div>
				<div class="noteText">
						Progress, not perfection, is what we should be asking of ourselves. Too far, too fast, and we can undo ourselves.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Shadow Artists > Location 909
				</div>
				<div class="noteText">
						We want to be great—immediately great—but that is not how recovery works. It is an awkward, tentative, even embarrassing process. There will be many times when we won’t look good—to ourselves or anyone else. We need to stop demanding that we do. It is impossible to get better and look good at the same time.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Your Enemy Within: Core Negative Beliefs > Location 981
				</div>
				<div class="noteText">
						Most blocked creatives carry unacknowledged either/or reasoning that stands between them and their work.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Your Enemy Within: Core Negative Beliefs > Location 984
				</div>
				<div class="noteText">
						I cannot believe that the inscrutable universe turns on an axis of suffering; surely the strange beauty of the world must somewhere rest on pure joy!
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Your Enemy Within: Core Negative Beliefs > Location 987
				</div>
				<div class="noteText">
						Your block doesn’t want you to see that. Its whole plan of attack is to make you irrationally afraid of some dire outcome you are too embarrassed to even mention. You know rationally that writing or painting shouldn’t be put off because of your silly fear, but because it is a silly fear, you don’t air it and the block stays intact.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Your Enemy Within: Core Negative Beliefs > Location 991
				</div>
				<div class="noteText">
						(Spelling fear is a remarkably common block.)
				</div>
				<div class="noteHeading">
						Note - Your Enemy Within: Core Negative Beliefs > Location 991
				</div>
				<div class="noteText">
						There's some passavges here whwre I have no jdea what she's talking about . Like I relate 0% to this.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Your Ally Within: Affirmative Weapons > Location 996
				</div>
				<div class="noteText">
						All too often, it is audacity and not talent that moves an artist to center stage.
				</div>
				<div class="noteHeading">
						Note - Your Ally Within: Affirmative Weapons > Location 997
				</div>
				<div class="noteText">
						'Audacity,' is a better way to think about self-promotion. It's not about being not-humble, it's about having audacity.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Your Ally Within: Affirmative Weapons > Location 999
				</div>
				<div class="noteText">
						We make speeches to ourselves and other willing victims: “I could do that better, if only . . .” You could do it better if only you would let yourself do it!
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Tasks > Location 1076
				</div>
				<div class="noteText">
						Every morning, set your clock one-half hour early; get up and write three pages of longhand, stream-of-consciousness morning writing. Do not reread these pages or allow anyone else to read them. Ideally, stick these pages in a large manila envelope, or hide them somewhere. Welcome to the morning pages. They will change you.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Tasks > Location 1101
				</div>
				<div class="noteText">
						Write a letter to the editor in your defense.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Tasks > Location 1103
				</div>
				<div class="noteText">
						List three old champions of your creative self-worth. This is your hall of champions, those who wish you and your creativity well. Be specific.
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Check-In > Location 1129
				</div>
				<div class="noteText">
						You will do check-ins every week. If you are running your creative week Sunday to Sunday, do your check-ins each Saturday.
				</div>
				<div class="sectionHeading">
						Week 2: Recovering a Sense of Identity
				</div>
				<div class="noteHeading">
						Highlight(<span class="highlight_yellow">yellow</span>) - Skepticism > Location 1343
				</div>
				<div class="noteText">
						Think of yourself as an incandescent power, illuminated and perhaps forever talked to by God and his messengers.
				</div>
		</div>
</body>
```

Here is the (2) template:
```
---
title: {{`.bookTitle`}} // ‘title: The Artist's Way - 25th Anniversary Edition’
author: {{`.authors`}} // ‘author: Julia Cameron’
---
# {{`.bookTitle`}} // ‘# The Artist's Way - 25th Anniversary Edition’
by [[{{`.authors`}}]] // ‘by Julia Cameron’

## Highlights
{{% for sectionHeading in allSectionHeadings %}}### {{`.sectionHeading`}} // ‘### Week 1: Recovering a Sense of Safety’
{{% for noteHeading in allNoteHeadings %}}{{% if `.noteHeading` contains “Highlight”}}From {{`.bookTitle`}} by {{`.authors`}} - *{{`.noteHeading` | filtered }}*: // ‘From The Artist's Way - 25th Anniversary Edition by Julia Cameron - *Shadow Artists*:’
> {{`.noteText`}} // ‘> Nothing has a stronger influence psychologically on their environment and especially on their children than the unlived life of the parent. C. G. JUNG’{{% endif %}}
{{% else if `.noteHeading` contains “Note”}}
{{`.noteText`}} // ‘Unfortunately this really rings true for me’
{{% endif %}}{{% endfor %}}{{% endfor %}}
```
